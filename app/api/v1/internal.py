"""
Internal REST API endpoints for inter-microservice communication.

Called by:
  - AgriLink Marketplace Microservice
  - RTO Vehicle Registry Microservice

Authentication: X-Service-Key header (pre-shared secret).
These endpoints are NOT accessible from the browser frontend.
"""
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.api.v1.dependencies import require_internal_service
from app.core.exceptions import NotFoundException
from app.core.security import decode_token
from app.repositories.citizen_repo import CitizenRepository
from app.repositories.kyc_repo import KycRepository
from app.repositories.persona_repo import PersonaRepository
from app.repositories.wallet_repo import WalletRepository
from app.services.citizen_service import WalletService
from app.schemas.wallet import (
    InternalWalletHoldRequest,
    InternalWalletCreditRequest,
    InternalWalletDebitRequest,
    InternalTokenIntrospectRequest,
)
from app.schemas.persona import DB_TO_UI_MAP

router = APIRouter(prefix="/internal", tags=["Internal — Microservice APIs"])


# ── Citizen identity verification ─────────────────────────────────────────────

@router.get(
    "/citizens/{citizen_id}/status",
    summary="[Internal] Get citizen status",
    description="AgriLink / RTO: Check if a citizen account is active, get KYC tier and verification flags.",
)
def get_citizen_status(
    citizen_id: uuid.UUID,
    _: bool = Depends(require_internal_service),
    db: Session = Depends(get_db),
):
    repo = CitizenRepository(db)
    kyc_repo = KycRepository(db)

    citizen = repo.get_by_id(citizen_id)
    if not citizen:
        raise NotFoundException(f"Citizen {citizen_id} not found")

    kyc = kyc_repo.get_latest_for_citizen(citizen_id)
    wallet_repo = WalletRepository(db)
    wallet = wallet_repo.get_wallet_by_citizen(citizen_id)

    return {
        "citizen_id": str(citizen_id),
        "full_name": citizen.full_name,
        "status": citizen.status,
        "email_verified": citizen.email_verified_at is not None,
        "mobile_verified": citizen.mobile_verified_at is not None,
        "kyc_tier": kyc.kyc_tier if kyc else "T0",
        "kyc_status": kyc.status if kyc else "PENDING",
        "wallet_id": str(wallet.id) if wallet else None,
        "wallet_status": wallet.status if wallet else None,
    }


@router.get(
    "/citizens/{citizen_id}/personas",
    summary="[Internal] Get citizen active personas",
    description="AgriLink / RTO: Get list of approved active personas for eligibility checks.",
)
def get_citizen_personas(
    citizen_id: uuid.UUID,
    _: bool = Depends(require_internal_service),
    db: Session = Depends(get_db),
):
    citizen_repo = CitizenRepository(db)
    persona_repo = PersonaRepository(db)

    citizen = citizen_repo.get_by_id(citizen_id)
    if not citizen:
        raise NotFoundException(f"Citizen {citizen_id} not found")

    all_personas = persona_repo.get_all_for_citizen(citizen_id)
    active_personas = [p for p in all_personas if p.status == "ACTIVE"]

    return {
        "citizen_id": str(citizen_id),
        "active_personas": [
            {
                "persona_type": p.persona_type,
                "persona_type_display": DB_TO_UI_MAP.get(p.persona_type, p.persona_type),
                "is_default": p.is_default,
            }
            for p in active_personas
        ],
    }


@router.get(
    "/citizens/{citizen_id}/eligibility",
    summary="[Internal] Check citizen eligibility for a persona",
    description="AgriLink / RTO: Verify that a citizen has an active, approved specific persona.",
)
def check_citizen_eligibility(
    citizen_id: uuid.UUID,
    persona: str,
    _: bool = Depends(require_internal_service),
    db: Session = Depends(get_db),
):
    citizen_repo = CitizenRepository(db)
    persona_repo = PersonaRepository(db)

    citizen = citizen_repo.get_by_id(citizen_id)
    if not citizen:
        raise NotFoundException(f"Citizen {citizen_id} not found")
    if citizen.status != "ACTIVE":
        return {
            "citizen_id": str(citizen_id),
            "eligible": False,
            "reason": f"Account is {citizen.status}",
        }

    # Normalize alias
    from app.schemas.persona import PERSONA_ALIAS_MAP
    mapped_persona = PERSONA_ALIAS_MAP.get(persona.upper(), persona.upper())

    match = persona_repo.get_by_citizen_and_type(citizen_id, mapped_persona)
    eligible = match is not None and match.status == "ACTIVE"

    return {
        "citizen_id": str(citizen_id),
        "persona_requested": persona.upper(),
        "persona_normalized": mapped_persona,
        "eligible": eligible,
        "reason": "Active persona found" if eligible else "Persona not active or not found",
    }


# ── Internal wallet operations ─────────────────────────────────────────────────

@router.post(
    "/wallets/{wallet_id}/hold",
    status_code=201,
    summary="[Internal] Place an escrow hold",
    description=(
        "AgriLink / RTO: Reserves funds in a citizen wallet for marketplace orders or rental deposits. "
        "Idempotent. Use for order payments before delivery confirmation."
    ),
)
def internal_hold(
    wallet_id: uuid.UUID,
    req: InternalWalletHoldRequest,
    _: bool = Depends(require_internal_service),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.internal_hold(wallet_id, req)


@router.post(
    "/wallets/{wallet_id}/release",
    summary="[Internal] Release an escrow hold",
    description=(
        "AgriLink / RTO: Releases a held amount back to the citizen's available balance. "
        "Used for cancelled orders or returned deposits."
    ),
)
def internal_release(
    wallet_id: uuid.UUID,
    hold_id: uuid.UUID,
    _: bool = Depends(require_internal_service),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.internal_release(wallet_id, hold_id)


@router.post(
    "/wallets/{wallet_id}/credit",
    status_code=201,
    summary="[Internal] Credit a citizen wallet",
    description=(
        "AgriLink settlement: Credits a wallet for earnings, refunds, or platform disbursements. "
        "Idempotent via idempotency_key."
    ),
)
def internal_credit(
    wallet_id: uuid.UUID,
    req: InternalWalletCreditRequest,
    _: bool = Depends(require_internal_service),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.internal_credit(wallet_id, req)


@router.post(
    "/wallets/{wallet_id}/debit",
    status_code=201,
    summary="[Internal] Debit a citizen wallet",
    description=(
        "AgriLink: Deducts platform fees or charges from a citizen wallet. "
        "Idempotent via idempotency_key."
    ),
)
def internal_debit(
    wallet_id: uuid.UUID,
    req: InternalWalletDebitRequest,
    _: bool = Depends(require_internal_service),
    db: Session = Depends(get_db),
):
    service = WalletService(db)
    return service.internal_debit(wallet_id, req)


# ── Token introspection ────────────────────────────────────────────────────────

@router.post(
    "/tokens/introspect",
    summary="[Internal] Validate a citizen access token",
    description=(
        "AgriLink / RTO: Verifies that a citizen access JWT is valid, unexpired, and not revoked. "
        "Returns citizen identity claims from the token payload."
    ),
)
def introspect_token(
    req: InternalTokenIntrospectRequest,
    _: bool = Depends(require_internal_service),
    db: Session = Depends(get_db),
):
    try:
        payload = decode_token(req.token)
    except Exception:
        return {
            "active": False,
            "citizen_id": None,
            "full_name": None,
            "status": None,
            "persona": None,
            "expires_at": None,
            "jti": None,
        }

    jti = payload.get("jti")
    repo = CitizenRepository(db)

    if repo.is_token_revoked(jti):
        return {
            "active": False,
            "citizen_id": None,
            "full_name": None,
            "status": None,
            "persona": None,
            "expires_at": None,
            "jti": jti,
        }

    import uuid as _uuid
    from datetime import datetime, timezone
    exp_ts = payload.get("exp")
    exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc).isoformat() if exp_ts else None

    return {
        "active": True,
        "citizen_id": payload.get("sub"),
        "full_name": payload.get("full_name"),
        "status": payload.get("status"),
        "persona": payload.get("persona"),
        "expires_at": exp_dt,
        "jti": jti,
    }
