import hashlib
import re
import uuid
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
    ConflictException,
)
from app.core.wallet_limits import get_effective_max_balance, get_kyc_max_balance
from app.repositories.citizen_repo import CitizenRepository
from app.repositories.profile_repo import CitizenProfileRepository
from app.repositories.persona_repo import PersonaRepository
from app.repositories.kyc_repo import KycRepository
from app.repositories.wallet_repo import WalletRepository
from app.schemas.citizen import ProfileUpdateRequest
from app.schemas.persona import (
    PersonaApplyRequest,
    RESTRICTED_PERSONA_TYPES,
    DB_TO_UI_MAP,
)
from app.schemas.kyc import (
    ALLOWED_DOCUMENT_TYPES,
)
from app.schemas.wallet import (
    TransferRequest,
    TopupRequest,
    CashoutRequest,
    WalletLimitUpdateRequest,
    InternalWalletHoldRequest,
    InternalWalletCreditRequest,
    InternalWalletDebitRequest,
)
from app.models.citizen import Citizen

logger = logging.getLogger("cis.citizen_service")


# ── Profile Service ────────────────────────────────────────────────────────────


class CitizenService:
    def __init__(self, db: Session):
        self.db = db
        self.citizen_repo = CitizenRepository(db)
        self.profile_repo = CitizenProfileRepository(db)
        self.wallet_repo = WalletRepository(db)
        self.kyc_repo = KycRepository(db)

    def get_full_profile(self, citizen: Citizen) -> Dict[str, Any]:
        profile = self.profile_repo.get_profile(citizen.id)
        kyc = self.kyc_repo.get_latest_for_citizen(citizen.id)
        active_personas = self.profile_repo.get_active_personas(citizen.id)
        wallet = self.profile_repo.get_wallet(citizen.id)

        return {
            "citizen_id": citizen.id,
            "public_citizen_id": citizen.public_citizen_id,
            "full_name": citizen.full_name,
            "email": citizen.email_normalized,
            "mobile": citizen.mobile_e164,
            "status": citizen.status,
            "kyc_tier": kyc.kyc_tier if kyc else "T0",
            "kyc_status": kyc.status if kyc else "PENDING",
            "date_of_birth": profile.date_of_birth if profile else None,
            "nationality_code": profile.nationality_code if profile else "IN",
            "address_line1": profile.address_line1 if profile else None,
            "address_line2": profile.address_line2 if profile else None,
            "city": profile.city if profile else None,
            "state_region": profile.state_region if profile else None,
            "postal_code": profile.postal_code if profile else None,
            "country_code": profile.country_code if profile else "IN",
            "preferred_language": profile.preferred_language if profile else "en",
            "profile_photo_ref": profile.profile_photo_ref if profile else None,
            "gender": profile.gender if profile else None,
            "addresses": profile.addresses if profile else [],
            "bank_accounts": profile.bank_accounts if profile else [],
            "active_personas": active_personas,
            "wallet_id": wallet.id if wallet else None,
            "wallet_status": wallet.status if wallet else None,
            "available_balance": str(wallet.available_balance) if wallet else "0.0000",
            "created_at": citizen.created_at.isoformat(),
            "updated_at": citizen.updated_at.isoformat(),
        }

    def update_profile(
        self,
        citizen: Citizen,
        req: ProfileUpdateRequest,
    ) -> Dict[str, Any]:
        update_fields: Dict[str, Any] = {}

        # Citizen-level fields
        if req.full_name and req.full_name != citizen.full_name:
            citizen.full_name = req.full_name
            citizen.updated_at = datetime.utcnow()
            update_fields["full_name"] = req.full_name

        if req.email is not None:
            email = req.email.strip().lower()
            existing = self.citizen_repo.get_by_email(email)
            if existing and existing.id != citizen.id:
                raise ConflictException("This email address is already in use.")
            if email != citizen.email_normalized:
                citizen.email_normalized = email
                citizen.email_verified_at = None
                citizen.updated_at = datetime.utcnow()
                update_fields["email"] = email

        if req.mobile is not None:
            mobile = re.sub(r"\s+", "", req.mobile)
            if not re.fullmatch(r"\+[1-9]\d{7,14}", mobile):
                raise BadRequestException(
                    "Mobile number must use international E.164 format."
                )
            existing = self.citizen_repo.get_by_mobile(mobile)
            if existing and existing.id != citizen.id:
                raise ConflictException("This mobile number is already in use.")
            if mobile != citizen.mobile_e164:
                citizen.mobile_e164 = mobile
                citizen.mobile_verified_at = None
                citizen.updated_at = datetime.utcnow()
                update_fields["mobile"] = mobile

        # Profile-level fields
        profile_map = {
            "preferred_language": req.preferred_language,
            "nationality_code": req.nationality_code,
            "date_of_birth": req.date_of_birth,
            "address_line1": req.address_line1,
            "address_line2": req.address_line2,
            "city": req.city,
            "state_region": req.state_region,
            "postal_code": req.postal_code,
            "country_code": req.country_code,
            "gender": req.gender,
            "addresses": (
                [address.model_dump(exclude_none=True) for address in req.addresses]
                if req.addresses is not None
                else None
            ),
            "bank_accounts": (
                [account.model_dump(exclude_none=True) for account in req.bank_accounts]
                if req.bank_accounts is not None
                else None
            ),
        }
        profile_updates = {k: v for k, v in profile_map.items() if v is not None}

        if profile_updates:
            result = self.profile_repo.update_profile(citizen.id, profile_updates)
            if result:
                _, old_vals = result
                update_fields.update({k: v for k, v in profile_updates.items()})

        if update_fields:
            self.profile_repo.record_change_history(
                citizen_id=citizen.id,
                changed_by_citizen_id=citizen.id,
                changed_fields=update_fields,
                reason="Self-service profile update",
            )
            self.db.commit()
            self.db.refresh(citizen)

        return self.get_full_profile(citizen)

    def get_profile_history(self, citizen: Citizen, limit: int = 20) -> List[Dict]:
        records = self.profile_repo.get_change_history(citizen.id, limit)
        return [
            {
                "id": str(r.id),
                "changed_fields": r.changed_fields,
                "reason": r.reason,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ]


# ── Persona Service ────────────────────────────────────────────────────────────


class PersonaService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PersonaRepository(db)

    def list_personas(self, citizen: Citizen) -> List[Dict]:
        personas = self.repo.get_all_for_citizen(citizen.id)
        result = []
        for p in personas:
            latest_approval = self.repo.get_latest_approval(p.id)
            result.append(
                {
                    "id": str(p.id),
                    "persona_type": p.persona_type,
                    "persona_type_display": DB_TO_UI_MAP.get(
                        p.persona_type, p.persona_type
                    ),
                    "status": p.status,
                    "is_default": p.is_default,
                    "display_name": p.display_name,
                    "created_at": p.created_at.isoformat(),
                    "updated_at": p.updated_at.isoformat(),
                    "latest_decision": (
                        latest_approval.decision if latest_approval else None
                    ),
                }
            )
        return result

    def apply_persona(self, citizen: Citizen, req: PersonaApplyRequest) -> Dict:
        # Prevent duplicate persona types
        existing = self.repo.get_by_citizen_and_type(citizen.id, req.persona_type)
        if existing:
            raise ConflictException(
                f"Citizen already has a {req.persona_type} persona (status: {existing.status})"
            )

        # Restricted personas require approval
        is_restricted = req.persona_type in RESTRICTED_PERSONA_TYPES
        initial_status = "PENDING" if is_restricted else "ACTIVE"

        persona = self.repo.create_persona(
            citizen_id=citizen.id,
            persona_type=req.persona_type,
            status=initial_status,
            is_default=False,
            display_name=req.display_name or req.persona_type.capitalize(),
        )

        # Create approval record
        self.repo.create_approval(
            persona_id=persona.id,
            decision="PENDING" if is_restricted else "APPROVED",
        )

        self.db.commit()

        message = (
            f"Persona application submitted. An admin will review your {req.persona_type} persona request."
            if is_restricted
            else f"{req.persona_type} persona activated successfully."
        )

        return {
            "success": True,
            "message": message,
            "persona_id": str(persona.id),
            "persona_type": persona.persona_type,
            "persona_type_display": DB_TO_UI_MAP.get(
                persona.persona_type, persona.persona_type
            ),
            "status": persona.status,
            "approval_required": is_restricted,
        }

    def activate_persona(self, citizen: Citizen, persona_id: uuid.UUID) -> Dict:
        persona = self.repo.get_by_id(persona_id)
        if not persona or persona.citizen_id != citizen.id:
            raise NotFoundException(
                "Persona not found or does not belong to this citizen"
            )
        if persona.status != "ACTIVE":
            raise BadRequestException(
                f"Cannot activate persona with status: {persona.status}. Persona must be ACTIVE."
            )

        # Clear other defaults then set this one
        self.repo.clear_default_for_citizen(citizen.id)
        persona.is_default = True
        persona.updated_at = datetime.utcnow()
        self.db.commit()

        return {
            "success": True,
            "message": f"{persona.persona_type} is now your active persona.",
            "persona_id": str(persona.id),
            "persona_type": persona.persona_type,
        }

    def admin_decide_persona(
        self,
        persona_id: uuid.UUID,
        decision: str,
        reviewer_citizen_id: uuid.UUID,
        reason_code: Optional[str] = None,
    ) -> Dict:
        persona = self.repo.get_by_id(persona_id)
        if not persona:
            raise NotFoundException("Persona not found")

        if decision == "APPROVED":
            self.repo.set_status(persona_id, "ACTIVE")
        else:
            self.repo.set_status(persona_id, "REJECTED")

        approval = self.repo.create_approval(
            persona_id=persona_id,
            decision=decision,
            reviewer_citizen_id=reviewer_citizen_id,
            reason_code=reason_code,
        )
        self.db.commit()

        return {
            "success": True,
            "persona_id": str(persona_id),
            "decision": decision,
            "reason_code": reason_code,
            "reviewed_at": (
                approval.reviewed_at.isoformat() if approval.reviewed_at else None
            ),
        }


# ── KYC Service ───────────────────────────────────────────────────────────────


class KycService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = KycRepository(db)

    def get_kyc_status(self, citizen: Citizen) -> Dict:
        record = self.repo.get_latest_for_citizen(citizen.id)
        if not record:
            return {
                "citizen_id": str(citizen.id),
                "kyc_tier": "T0",
                "status": "PENDING",
                "submitted_at": None,
                "reviewed_at": None,
                "expires_at": None,
                "review_reason_code": None,
                "documents_count": 0,
                "documents": [],
            }
        docs = self.repo.get_documents_for_record(record.id)
        return {
            "citizen_id": str(citizen.id),
            "kyc_tier": record.kyc_tier,
            "status": record.status,
            "submitted_at": record.submitted_at.isoformat(),
            "reviewed_at": (
                record.reviewed_at.isoformat() if record.reviewed_at else None
            ),
            "expires_at": record.expires_at.isoformat() if record.expires_at else None,
            "review_reason_code": record.review_reason_code,
            "documents_count": len(docs),
            "documents": [
                {
                    "document_id": str(doc.id),
                    "document_type": doc.document_type,
                    "document_number_masked": doc.document_number_masked,
                    "details": doc.details or {},
                    "verification_status": doc.verification_status,
                    "uploaded_at": doc.uploaded_at.isoformat(),
                }
                for doc in sorted(docs, key=lambda item: item.uploaded_at, reverse=True)
            ],
        }

    def submit_document(
        self,
        citizen: Citizen,
        document_type: str,
        document_number: Optional[str],
        details: Dict[str, Any],
        document_number_token: Optional[str] = None,
    ) -> Dict:
        if document_type.upper() not in ALLOWED_DOCUMENT_TYPES:
            raise BadRequestException(
                f"Unsupported document type: {document_type}. Allowed: {sorted(ALLOWED_DOCUMENT_TYPES)}"
            )

        # Get or create KYC record
        record = self.repo.get_latest_for_citizen(citizen.id)
        if not record or record.status in ("VERIFIED", "REJECTED", "EXPIRED"):
            record = self.repo.create_record(
                citizen_id=citizen.id,
                kyc_tier="T0",
                status="PENDING",
            )

        doc = self.repo.create_document(
            kyc_record_id=record.id,
            document_type=document_type.upper(),
            document_number_masked=self._mask_document_number(
                document_type, document_number
            ),
            details=details,
            document_number_token=document_number_token,
        )

        # Move KYC record to IN_REVIEW
        if record.status == "PENDING":
            record.status = "IN_REVIEW"
            record.submitted_at = datetime.utcnow()

        self.db.commit()

        return {
            "success": True,
            "message": "Document details saved and submitted for review.",
            "document_id": str(doc.id),
            "kyc_record_id": str(record.id),
            "document_type": doc.document_type,
            "verification_status": doc.verification_status,
            "uploaded_at": doc.uploaded_at.isoformat(),
        }

    @staticmethod
    def _mask_document_number(
        document_type: str, document_number: Optional[str]
    ) -> Optional[str]:
        if not document_number:
            return None
        if document_type.upper() == "AADHAAR":
            last_four = document_number[-4:]
            return (
                f"•••• •••• {last_four}"
                if len(document_number) > 4
                else f"•••• {last_four}"
            )
        if len(document_number) <= 4:
            return "*" * len(document_number)
        return f"{document_number[:2]}{'*' * (len(document_number) - 4)}{document_number[-2:]}"


# ── Wallet Service ─────────────────────────────────────────────────────────────


class WalletService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = WalletRepository(db)
        self.citizen_repo = CitizenRepository(db)
        self.profile_repo = CitizenProfileRepository(db)

    def get_wallet_summary(self, citizen: Citizen) -> Dict:
        wallet = self.repo.get_wallet_by_citizen(citizen.id)
        if not wallet:
            raise NotFoundException("No wallet found for this citizen")

        held = self.repo.get_held_balance(wallet.id)
        today = self.repo.get_spent_today(wallet.id)
        month = self.repo.get_spent_this_month(wallet.id)

        return {
            "wallet_id": str(wallet.id),
            "citizen_id": str(wallet.citizen_id),
            "currency_code": wallet.currency_code,
            "status": wallet.status,
            "available_balance": str(wallet.available_balance),
            "held_balance": str(held),
            "total_balance": str(wallet.available_balance + held),
            "today_spent": str(today),
            "month_spent": str(month),
            "max_balance": str(get_effective_max_balance(self.db, citizen.id)),
            "updated_at": wallet.updated_at.isoformat(),
        }

    def update_wallet_max_balance(
        self, citizen: Citizen, req: WalletLimitUpdateRequest
    ) -> Dict:
        wallet = self.repo.get_wallet_by_citizen(citizen.id, for_update=True)
        if not wallet:
            raise NotFoundException("No wallet found for this citizen")

        kyc_max = get_kyc_max_balance(self.db, citizen.id)
        if req.max_balance > kyc_max:
            raise BadRequestException(
                f"Your KYC tier allows a maximum wallet balance of ₹{kyc_max}."
            )

        current_total = wallet.available_balance + self.repo.get_held_balance(wallet.id)
        if req.max_balance < current_total:
            raise BadRequestException(
                f"Maximum balance cannot be lower than your current wallet balance of ₹{current_total}."
            )

        profile = self.profile_repo.get_profile(citizen.id)
        if not profile:
            raise NotFoundException("Citizen profile not found")
        profile.wallet_max_balance = req.max_balance
        profile.updated_at = datetime.utcnow()
        self.db.commit()
        return {
            "success": True,
            "max_balance": str(req.max_balance),
            "kyc_max_balance": str(kyc_max),
        }

    def get_transactions(
        self, citizen: Citizen, limit: int = 50, offset: int = 0
    ) -> List[Dict]:
        wallet = self.repo.get_wallet_by_citizen(citizen.id)
        if not wallet:
            return []
        txs = self.repo.get_transactions(wallet.id, limit=limit, offset=offset)
        return [
            {
                "id": str(tx.id),
                "transaction_type": tx.transaction_type,
                "amount": str(tx.amount),
                "currency_code": tx.currency_code,
                "status": tx.status,
                "direction": next(
                    (
                        entry.entry_type
                        for entry in tx.ledger_entries
                        if entry.wallet_id == wallet.id
                    ),
                    None,
                ),
                "description": tx.description,
                "reference_type": tx.reference_type,
                "counterparty_wallet_id": (
                    str(tx.counterparty_wallet_id)
                    if tx.counterparty_wallet_id
                    else None
                ),
                "created_at": tx.created_at.isoformat(),
                "posted_at": tx.posted_at.isoformat() if tx.posted_at else None,
                "failure_code": tx.failure_code,
            }
            for tx in txs
        ]

    def _idempotency_hash(self, citizen_id: uuid.UUID, req_data: str) -> str:
        return hashlib.sha256(f"{citizen_id}:{req_data}".encode("utf-8")).hexdigest()

    def transfer(self, citizen: Citizen, req: TransferRequest) -> Dict:
        # Idempotency check
        req_hash = self._idempotency_hash(
            citizen.id, f"{req.recipient_identifier}:{req.amount}:{req.idempotency_key}"
        )
        self.repo.check_idempotency(
            citizen.id, req.idempotency_key, "TRANSFER", req_hash
        )
        idmp = self.repo.create_idempotency(
            citizen.id, req.idempotency_key, req_hash, "TRANSFER"
        )

        # Resolve recipient
        recipient = self.citizen_repo.get_by_identifier(req.recipient_identifier)
        if not recipient:
            raise NotFoundException(f"Recipient not found: {req.recipient_identifier}")
        if recipient.id == citizen.id:
            raise BadRequestException("Cannot transfer funds to your own account")
        if recipient.status != "ACTIVE":
            raise BadRequestException("Recipient account is not active")

        sender_wallet = self.repo.get_wallet_by_citizen(citizen.id)
        recipient_wallet = self.repo.get_wallet_by_citizen(recipient.id)

        if not sender_wallet:
            raise NotFoundException("Sender wallet not found")
        if not recipient_wallet:
            raise NotFoundException("Recipient does not have an active wallet")

        amount = Decimal(str(req.amount))
        sender_tx, _ = self.repo.transfer(
            sender_wallet_id=sender_wallet.id,
            recipient_wallet_id=recipient_wallet.id,
            amount=amount,
            description=req.description,
            initiated_by_citizen_id=citizen.id,
        )

        self.repo.complete_idempotency(idmp.id, sender_tx.id)
        self.db.commit()

        return {
            "success": True,
            "message": f"₹{amount} transferred successfully",
            "transaction_id": str(sender_tx.id),
            "amount": str(amount),
            "recipient_name": recipient.full_name,
            "status": sender_tx.status,
            "created_at": sender_tx.created_at.isoformat(),
        }

    def topup(self, citizen: Citizen, req: TopupRequest) -> Dict:
        req_hash = self._idempotency_hash(
            citizen.id, f"{req.amount}:{req.idempotency_key}"
        )
        self.repo.check_idempotency(citizen.id, req.idempotency_key, "TOPUP", req_hash)
        idmp = self.repo.create_idempotency(
            citizen.id, req.idempotency_key, req_hash, "TOPUP"
        )

        wallet = self.repo.get_wallet_by_citizen(citizen.id, for_update=True)
        if not wallet:
            raise NotFoundException("Wallet not found")

        amount = Decimal(str(req.amount))
        current_total = wallet.available_balance + self.repo.get_held_balance(wallet.id)
        max_balance = get_effective_max_balance(self.db, citizen.id)
        if current_total + amount > max_balance:
            raise BadRequestException(
                f"Top-up would exceed your configured maximum balance of ₹{max_balance}."
            )

        tx = self.repo.credit_wallet(
            wallet_id=wallet.id,
            amount=amount,
            transaction_type="TOPUP",
            description=(
                f"Top-up via {req.provider_name}"
                + (
                    f" (provider reference: {req.provider_reference})"
                    if req.provider_reference
                    else ""
                )
            ),
            reference_type=req.provider_name,
            initiated_by_citizen_id=citizen.id,
        )

        self.repo.complete_idempotency(idmp.id, tx.id)
        self.db.commit()

        return {
            "success": True,
            "message": f"₹{amount} credited to wallet",
            "transaction_id": str(tx.id),
            "amount": str(amount),
            "status": tx.status,
            "created_at": tx.created_at.isoformat(),
        }

    def cashout(self, citizen: Citizen, req: CashoutRequest) -> Dict:
        req_hash = self._idempotency_hash(
            citizen.id, f"{req.amount}:{req.idempotency_key}"
        )
        self.repo.check_idempotency(
            citizen.id, req.idempotency_key, "CASHOUT", req_hash
        )
        idmp = self.repo.create_idempotency(
            citizen.id, req.idempotency_key, req_hash, "CASHOUT"
        )

        wallet = self.repo.get_wallet_by_citizen(citizen.id)
        if not wallet:
            raise NotFoundException("Wallet not found")

        amount = Decimal(str(req.amount))
        tx = self.repo.debit_wallet(
            wallet_id=wallet.id,
            amount=amount,
            transaction_type="CASHOUT",
            description=f"Cash-out to: {req.beneficiary_reference}",
            reference_type="CASHOUT",
            initiated_by_citizen_id=citizen.id,
        )

        self.repo.complete_idempotency(idmp.id, tx.id)
        self.db.commit()

        return {
            "success": True,
            "message": f"₹{amount} cash-out initiated",
            "transaction_id": str(tx.id),
            "amount": str(amount),
            "status": tx.status,
            "created_at": tx.created_at.isoformat(),
        }

    def get_holds(self, citizen: Citizen) -> List[Dict]:
        wallet = self.repo.get_wallet_by_citizen(citizen.id)
        if not wallet:
            return []
        holds = self.repo.get_holds(wallet.id)
        return [
            {
                "id": str(h.id),
                "wallet_id": str(h.wallet_id),
                "amount": str(h.amount),
                "status": h.status,
                "reason_code": h.reason_code,
                "expires_at": h.expires_at.isoformat() if h.expires_at else None,
                "created_at": h.created_at.isoformat(),
                "released_at": h.released_at.isoformat() if h.released_at else None,
            }
            for h in holds
        ]

    def release_hold(self, citizen: Citizen, hold_id: uuid.UUID) -> Dict:
        wallet = self.repo.get_wallet_by_citizen(citizen.id)
        if not wallet:
            raise NotFoundException("Wallet not found")

        hold = self.repo.get_hold_by_id(hold_id)
        if not hold or hold.wallet_id != wallet.id:
            raise NotFoundException("Hold not found or does not belong to this wallet")

        released_tx, released_hold = self.repo.release_hold(
            hold_id=hold_id, refund_to_wallet=True
        )
        self.db.commit()

        return {
            "success": True,
            "message": "Hold released and funds returned to wallet",
            "hold_id": str(hold_id),
            "transaction_id": str(released_tx.id),
            "amount": str(released_hold.amount),
            "status": released_hold.status,
            "created_at": released_tx.created_at.isoformat(),
        }

    # ── Internal microservice operations ─────────────────────────────────────

    def internal_hold(
        self,
        wallet_id: uuid.UUID,
        req: InternalWalletHoldRequest,
    ) -> Dict:
        wallet = self.repo.get_wallet(wallet_id)
        if not wallet:
            raise NotFoundException("Wallet not found")

        req_hash = self._idempotency_hash(
            wallet.citizen_id, f"HOLD:{req.amount}:{req.idempotency_key}"
        )
        self.repo.check_idempotency(
            wallet.citizen_id, req.idempotency_key, "INTERNAL_HOLD", req_hash
        )
        idmp = self.repo.create_idempotency(
            wallet.citizen_id, req.idempotency_key, req_hash, "INTERNAL_HOLD"
        )

        amount = Decimal(str(req.amount))
        tx, hold = self.repo.create_hold(
            wallet_id=wallet_id,
            amount=amount,
            reason_code=req.reason_code,
            expires_in_hours=req.expires_in_hours,
        )

        self.repo.complete_idempotency(idmp.id, tx.id)
        self.db.commit()

        return {
            "success": True,
            "hold_id": str(hold.id),
            "transaction_id": str(tx.id),
            "amount": str(amount),
            "status": hold.status,
        }

    def internal_release(self, wallet_id: uuid.UUID, hold_id: uuid.UUID) -> Dict:
        hold = self.repo.get_hold_by_id(hold_id)
        if not hold or hold.wallet_id != wallet_id:
            raise NotFoundException("Hold not found for this wallet")

        _, released_hold = self.repo.release_hold(
            hold_id=hold_id, refund_to_wallet=True
        )
        self.db.commit()

        return {
            "success": True,
            "hold_id": str(hold_id),
            "status": released_hold.status,
            "amount": str(released_hold.amount),
        }

    def internal_credit(
        self,
        wallet_id: uuid.UUID,
        req: InternalWalletCreditRequest,
    ) -> Dict:
        wallet = self.repo.get_wallet(wallet_id)
        if not wallet:
            raise NotFoundException("Wallet not found")

        req_hash = self._idempotency_hash(
            wallet.citizen_id, f"CREDIT:{req.amount}:{req.idempotency_key}"
        )
        self.repo.check_idempotency(
            wallet.citizen_id, req.idempotency_key, "INTERNAL_CREDIT", req_hash
        )
        idmp = self.repo.create_idempotency(
            wallet.citizen_id, req.idempotency_key, req_hash, "INTERNAL_CREDIT"
        )

        amount = Decimal(str(req.amount))
        tx = self.repo.credit_wallet(
            wallet_id=wallet_id,
            amount=amount,
            transaction_type="ADJUSTMENT",
            description=req.description,
            reference_type=req.reference_type,
        )

        self.repo.complete_idempotency(idmp.id, tx.id)
        self.db.commit()

        return {
            "success": True,
            "transaction_id": str(tx.id),
            "amount": str(amount),
            "status": tx.status,
        }

    def internal_debit(
        self,
        wallet_id: uuid.UUID,
        req: InternalWalletDebitRequest,
    ) -> Dict:
        wallet = self.repo.get_wallet(wallet_id)
        if not wallet:
            raise NotFoundException("Wallet not found")

        req_hash = self._idempotency_hash(
            wallet.citizen_id, f"DEBIT:{req.amount}:{req.idempotency_key}"
        )
        self.repo.check_idempotency(
            wallet.citizen_id, req.idempotency_key, "INTERNAL_DEBIT", req_hash
        )
        idmp = self.repo.create_idempotency(
            wallet.citizen_id, req.idempotency_key, req_hash, "INTERNAL_DEBIT"
        )

        amount = Decimal(str(req.amount))
        tx = self.repo.debit_wallet(
            wallet_id=wallet_id,
            amount=amount,
            transaction_type="PURCHASE",
            description=req.description,
            reference_type=req.reference_type,
        )

        self.repo.complete_idempotency(idmp.id, tx.id)
        self.db.commit()

        return {
            "success": True,
            "transaction_id": str(tx.id),
            "amount": str(amount),
            "status": tx.status,
        }
