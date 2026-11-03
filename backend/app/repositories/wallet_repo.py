"""
Wallet repository — all financial DB operations.
Critical rules:
  - All balance arithmetic uses Decimal (never float).
  - SELECT ... FOR UPDATE is used before any balance mutation.
  - Ledger entries are always created in pairs (DEBIT + CREDIT).
  - Idempotency keys are checked before any mutating operation.
"""
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import select, update, and_, func, text
from sqlalchemy.orm import Session

from app.models.wallet import (
    Wallet,
    WalletTransaction,
    LedgerEntry,
    WalletHold,
    WalletLimit,
    IdempotencyRecord,
    TopupRequest,
    CashoutRequest,
)
from app.core.exceptions import (
    InsufficientFundsException,
    IdempotencyConflictException,
    BadRequestException,
)


class WalletRepository:
    def __init__(self, db: Session):
        self.db = db

    # ── Wallet read ────────────────────────────────────────────────────────────

    def get_wallet(
        self, wallet_id: uuid.UUID, for_update: bool = False
    ) -> Optional[Wallet]:
        stmt = select(Wallet).where(Wallet.id == wallet_id)
        if for_update:
            stmt = stmt.with_for_update()
        return self.db.scalars(stmt).first()

    def get_wallet_by_citizen(
        self,
        citizen_id: uuid.UUID,
        currency: str = "INR",
        for_update: bool = False,
    ) -> Optional[Wallet]:
        stmt = select(Wallet).where(
            and_(
                Wallet.citizen_id == citizen_id,
                Wallet.currency_code == currency,
            )
        )
        if for_update:
            stmt = stmt.with_for_update()
        return self.db.scalars(stmt).first()

    def get_held_balance(self, wallet_id: uuid.UUID) -> Decimal:
        stmt = select(
            func.coalesce(func.sum(WalletHold.amount), Decimal("0"))
        ).where(
            and_(
                WalletHold.wallet_id == wallet_id,
                WalletHold.status == "ACTIVE",
            )
        )
        result = self.db.execute(stmt).scalar()
        return Decimal(str(result)) if result else Decimal("0")

    def get_spent_today(self, wallet_id: uuid.UUID) -> Decimal:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = select(
            func.coalesce(func.sum(LedgerEntry.amount), Decimal("0"))
        ).where(
            and_(
                LedgerEntry.wallet_id == wallet_id,
                LedgerEntry.entry_type == "DEBIT",
                LedgerEntry.created_at >= today_start,
            )
        )
        result = self.db.execute(stmt).scalar()
        return Decimal(str(result)) if result else Decimal("0")

    def get_spent_this_month(self, wallet_id: uuid.UUID) -> Decimal:
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        stmt = select(
            func.coalesce(func.sum(LedgerEntry.amount), Decimal("0"))
        ).where(
            and_(
                LedgerEntry.wallet_id == wallet_id,
                LedgerEntry.entry_type == "DEBIT",
                LedgerEntry.created_at >= month_start,
            )
        )
        result = self.db.execute(stmt).scalar()
        return Decimal(str(result)) if result else Decimal("0")

    def get_transactions(
        self,
        wallet_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[WalletTransaction]:
        stmt = (
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet_id)
            .order_by(WalletTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.scalars(stmt).all())

    def get_holds(
        self, wallet_id: uuid.UUID, active_only: bool = False
    ) -> List[WalletHold]:
        stmt = select(WalletHold).where(WalletHold.wallet_id == wallet_id)
        if active_only:
            stmt = stmt.where(WalletHold.status == "ACTIVE")
        return list(self.db.scalars(stmt).order_by(WalletHold.created_at.desc()).all())

    def get_hold_by_id(self, hold_id: uuid.UUID) -> Optional[WalletHold]:
        stmt = select(WalletHold).where(WalletHold.id == hold_id)
        return self.db.scalars(stmt).first()

    # ── Idempotency ───────────────────────────────────────────────────────────

    def check_idempotency(
        self,
        citizen_id: uuid.UUID,
        idempotency_key: str,
        operation_type: str,
        request_hash: str,
    ) -> Optional[IdempotencyRecord]:
        stmt = select(IdempotencyRecord).where(
            and_(
                IdempotencyRecord.citizen_id == citizen_id,
                IdempotencyRecord.idempotency_key == idempotency_key,
            )
        )
        record = self.db.scalars(stmt).first()
        if record:
            raise IdempotencyConflictException(
                f"A request with this idempotency key has already been submitted (status: {record.status})."
            )
        return record

    def create_idempotency(
        self,
        citizen_id: uuid.UUID,
        idempotency_key: str,
        request_hash: str,
        operation_type: str,
    ) -> IdempotencyRecord:
        rec = IdempotencyRecord(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            idempotency_key=idempotency_key,
            request_hash=request_hash,
            operation_type=operation_type,
            status="IN_PROGRESS",
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        self.db.add(rec)
        self.db.flush()
        return rec

    def complete_idempotency(
        self, idempotency_id: uuid.UUID, transaction_id: uuid.UUID
    ) -> None:
        stmt = (
            update(IdempotencyRecord)
            .where(IdempotencyRecord.id == idempotency_id)
            .values(status="COMPLETED", transaction_id=transaction_id)
        )
        self.db.execute(stmt)
        self.db.flush()    # ── Double-entry ledger operations ────────────────────────────────────────

    def _create_transaction(
        self,
        wallet_id: uuid.UUID,
        transaction_type: str,
        amount: Decimal,
        currency_code: str = "INR",
        description: Optional[str] = None,
        reference_type: Optional[str] = None,
        counterparty_wallet_id: Optional[uuid.UUID] = None,
        initiated_by_citizen_id: Optional[uuid.UUID] = None,
        status: str = "PENDING",
    ) -> WalletTransaction:
        tx = WalletTransaction(
            id=uuid.uuid4(),
            wallet_id=wallet_id,
            transaction_type=transaction_type,
            amount=amount,
            currency_code=currency_code,
            status=status,
            description=description,
            reference_type=reference_type,
            counterparty_wallet_id=counterparty_wallet_id,
            initiated_by_citizen_id=initiated_by_citizen_id,
            created_at=datetime.utcnow(),
        )
        self.db.add(tx)
        self.db.flush()
        return tx

    def _post_ledger_entry(
        self,
        transaction_id: uuid.UUID,
        wallet_id: uuid.UUID,
        entry_type: str,
        amount: Decimal,
        balance_after: Decimal,
        currency_code: str = "INR",
    ) -> LedgerEntry:
        entry = LedgerEntry(
            id=uuid.uuid4(),
            transaction_id=transaction_id,
            wallet_id=wallet_id,
            entry_type=entry_type,
            amount=amount,
            currency_code=currency_code,
            balance_after=balance_after,
            created_at=datetime.utcnow(),
        )
        self.db.add(entry)
        self.db.flush()
        return entry

    def _post_transaction(self, tx: WalletTransaction) -> None:
        tx.status = "POSTED"
        tx.posted_at = datetime.utcnow()
        self.db.flush()

    # ── Credit (TOPUP, REFUND, settlement credit) ─────────────────────────────

    def credit_wallet(
        self,
        wallet_id: uuid.UUID,
        amount: Decimal,
        transaction_type: str = "TOPUP",
        description: Optional[str] = None,
        reference_type: Optional[str] = None,
        initiated_by_citizen_id: Optional[uuid.UUID] = None,
        counterparty_wallet_id: Optional[uuid.UUID] = None,
    ) -> WalletTransaction:
        wallet = self.get_wallet(wallet_id, for_update=True)
        if not wallet or wallet.status != "ACTIVE":
            raise BadRequestException("Wallet is not active or does not exist")

        # Create transaction record
        tx = self._create_transaction(
            wallet_id=wallet_id,
            transaction_type=transaction_type,
            amount=amount,
            description=description,
            reference_type=reference_type,
            counterparty_wallet_id=counterparty_wallet_id,
            initiated_by_citizen_id=initiated_by_citizen_id,
        )

        # Update balance
        new_balance = wallet.available_balance + amount
        wallet.available_balance = new_balance
        wallet.updated_at = datetime.utcnow()

        # Double-entry: CREDIT entry
        self._post_ledger_entry(
            transaction_id=tx.id,
            wallet_id=wallet_id,
            entry_type="CREDIT",
            amount=amount,
            balance_after=new_balance,
        )

        self._post_transaction(tx)
        return tx

    # ── Debit (TRANSFER sender side, CASHOUT, PURCHASE) ───────────────────────

    def debit_wallet(
        self,
        wallet_id: uuid.UUID,
        amount: Decimal,
        transaction_type: str = "TRANSFER",
        description: Optional[str] = None,
        reference_type: Optional[str] = None,
        initiated_by_citizen_id: Optional[uuid.UUID] = None,
        counterparty_wallet_id: Optional[uuid.UUID] = None,
    ) -> WalletTransaction:
        wallet = self.get_wallet(wallet_id, for_update=True)
        if not wallet or wallet.status != "ACTIVE":
            raise BadRequestException("Wallet is not active or does not exist")

        if wallet.available_balance < amount:
            raise InsufficientFundsException(
                f"Insufficient balance. Available: ₹{wallet.available_balance}, Required: ₹{amount}"
            )

        tx = self._create_transaction(
            wallet_id=wallet_id,
            transaction_type=transaction_type,
            amount=amount,
            description=description,
            reference_type=reference_type,
            counterparty_wallet_id=counterparty_wallet_id,
            initiated_by_citizen_id=initiated_by_citizen_id,
        )

        new_balance = wallet.available_balance - amount
        wallet.available_balance = new_balance
        wallet.updated_at = datetime.utcnow()

        self._post_ledger_entry(
            transaction_id=tx.id,
            wallet_id=wallet_id,
            entry_type="DEBIT",
            amount=amount,
            balance_after=new_balance,
        )

        self._post_transaction(tx)
        return tx

    # ── Peer-to-peer transfer (atomic double-entry) ───────────────────────────

    def transfer(
        self,
        sender_wallet_id: uuid.UUID,
        recipient_wallet_id: uuid.UUID,
        amount: Decimal,
        description: Optional[str] = None,
        initiated_by_citizen_id: Optional[uuid.UUID] = None,
    ) -> Tuple[WalletTransaction, WalletTransaction]:
        """
        Atomic double-entry transfer:
        1. Lock both wallets in consistent UUID order to prevent deadlocks.
        2. Debit sender → create DEBIT ledger entry.
        3. Credit recipient → create CREDIT ledger entry.
        4. Post both transactions.
        Returns (sender_tx, recipient_tx).
        """
        # Lock in consistent order to prevent deadlock
        first_id, second_id = sorted([sender_wallet_id, recipient_wallet_id])
        w_first = self.get_wallet(first_id, for_update=True)
        w_second = self.get_wallet(second_id, for_update=True)

        sender = w_first if w_first.id == sender_wallet_id else w_second
        recipient = w_first if w_first.id == recipient_wallet_id else w_second

        if not sender or sender.status != "ACTIVE":
            raise BadRequestException("Sender wallet is not active")
        if not recipient or recipient.status != "ACTIVE":
            raise BadRequestException("Recipient wallet is not active")
        if sender_wallet_id == recipient_wallet_id:
            raise BadRequestException("Cannot transfer to the same wallet")
        if sender.available_balance < amount:
            raise InsufficientFundsException(
                f"Insufficient balance. Available: ₹{sender.available_balance}, Required: ₹{amount}"
            )

        # Sender: TRANSFER debit
        sender_tx = self._create_transaction(
            wallet_id=sender_wallet_id,
            transaction_type="TRANSFER",
            amount=amount,
            description=description,
            counterparty_wallet_id=recipient_wallet_id,
            initiated_by_citizen_id=initiated_by_citizen_id,
        )
        new_sender_balance = sender.available_balance - amount
        sender.available_balance = new_sender_balance
        sender.updated_at = datetime.utcnow()
        self._post_ledger_entry(
            transaction_id=sender_tx.id,
            wallet_id=sender_wallet_id,
            entry_type="DEBIT",
            amount=amount,
            balance_after=new_sender_balance,
        )
        self._post_transaction(sender_tx)

        # Recipient: TRANSFER credit
        recipient_tx = self._create_transaction(
            wallet_id=recipient_wallet_id,
            transaction_type="TRANSFER",
            amount=amount,
            description=description,
            counterparty_wallet_id=sender_wallet_id,
            initiated_by_citizen_id=initiated_by_citizen_id,
        )
        new_recipient_balance = recipient.available_balance + amount
        recipient.available_balance = new_recipient_balance
        recipient.updated_at = datetime.utcnow()
        self._post_ledger_entry(
            transaction_id=recipient_tx.id,
            wallet_id=recipient_wallet_id,
            entry_type="CREDIT",
            amount=amount,
            balance_after=new_recipient_balance,
        )
        self._post_transaction(recipient_tx)

        return sender_tx, recipient_tx

    # ── Hold management ───────────────────────────────────────────────────────

    def create_hold(
        self,
        wallet_id: uuid.UUID,
        amount: Decimal,
        reason_code: str,
        expires_in_hours: Optional[int] = None,
        initiated_by_citizen_id: Optional[uuid.UUID] = None,
    ) -> Tuple[WalletTransaction, WalletHold]:
        wallet = self.get_wallet(wallet_id, for_update=True)
        if not wallet or wallet.status != "ACTIVE":
            raise BadRequestException("Wallet is not active")
        if wallet.available_balance < amount:
            raise InsufficientFundsException(
                f"Insufficient balance for hold. Available: ₹{wallet.available_balance}"
            )

        tx = self._create_transaction(
            wallet_id=wallet_id,
            transaction_type="HOLD",
            amount=amount,
            description=f"Hold: {reason_code}",
            initiated_by_citizen_id=initiated_by_citizen_id,
        )

        new_balance = wallet.available_balance - amount
        wallet.available_balance = new_balance
        wallet.updated_at = datetime.utcnow()

        self._post_ledger_entry(
            transaction_id=tx.id,
            wallet_id=wallet_id,
            entry_type="DEBIT",
            amount=amount,
            balance_after=new_balance,
        )
        self._post_transaction(tx)

        expires_at = (
            datetime.utcnow() + timedelta(hours=expires_in_hours)
            if expires_in_hours
            else None
        )
        hold = WalletHold(
            id=uuid.uuid4(),
            wallet_id=wallet_id,
            transaction_id=tx.id,
            amount=amount,
            status="ACTIVE",
            reason_code=reason_code,
            expires_at=expires_at,
            created_at=datetime.utcnow(),
        )
        self.db.add(hold)
        self.db.flush()

        return tx, hold

    def release_hold(
        self,
        hold_id: uuid.UUID,
        refund_to_wallet: bool = True,
        initiated_by_citizen_id: Optional[uuid.UUID] = None,
    ) -> Tuple[WalletTransaction, WalletHold]:
        hold = self.get_hold_by_id(hold_id)
        if not hold or hold.status != "ACTIVE":
            raise BadRequestException("Hold is not active or does not exist")

        wallet = self.get_wallet(hold.wallet_id, for_update=True)

        if refund_to_wallet:
            # Return funds to wallet
            tx = self._create_transaction(
                wallet_id=hold.wallet_id,
                transaction_type="RELEASE",
                amount=hold.amount,
                description=f"Released hold: {hold.reason_code}",
                initiated_by_citizen_id=initiated_by_citizen_id,
            )
            new_balance = wallet.available_balance + hold.amount
            wallet.available_balance = new_balance
            wallet.updated_at = datetime.utcnow()
            self._post_ledger_entry(
                transaction_id=tx.id,
                wallet_id=hold.wallet_id,
                entry_type="CREDIT",
                amount=hold.amount,
                balance_after=new_balance,
            )
            self._post_transaction(tx)
        else:
            tx = self._create_transaction(
                wallet_id=hold.wallet_id,
                transaction_type="RELEASE",
                amount=hold.amount,
                description=f"Captured hold: {hold.reason_code}",
                initiated_by_citizen_id=initiated_by_citizen_id,
            )
            self._post_transaction(tx)

        hold.status = "RELEASED" if refund_to_wallet else "CAPTURED"
        hold.released_at = datetime.utcnow()
        self.db.flush()

        return tx, hold
