"""Admin operations API router.

Protected by service credentials / internal administrative access (X-Service-Key).
Supports persona approval review, KYC review, wallet limits, and audit logs.
"""
from __future__ import annotations

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.v1.dependencies import require_internal_service
from app.core.exceptions import NotFoundException
from app.db.dependencies import get_db
from app.repositories.admin_repo import AdminRepository
from app.repositories.kyc_repo import KycRepository
from app.schemas.admin import (
    PersonaApplicationItem,
    PersonaApplicationListResponse,
    AuditLogItem,
    AuditLogListResponse,
    WalletLimitItem,
    WalletLimitListResponse,
)
from app.schemas.persona import DB_TO_UI_MAP, PersonaAdminDecisionRequest
from app.schemas.kyc import KycAdminReviewRequest
from app.services.citizen_service import PersonaService

logger = logging.getLogger("cis.admin")

router = APIRouter(prefix="/admin", tags=["Admin Operations"], dependencies=[Depends(require_internal_service)])


@router.get(
    "/persona-applications",
    response_model=PersonaApplicationListResponse,
    summary="List pending persona applications",
)
def list_pending_persona_applications(
    db: Session = Depends(get_db),
):
    repo = AdminRepository(db)
    rows = repo.list_pending_persona_applications()
    items = []
    for approval, persona, citizen in rows:
        items.append(
            PersonaApplicationItem(
                approval_id=approval.id,
                persona_id=persona.id,
                citizen_id=citizen.id,
                citizen_name=citizen.full_name,
                citizen_email=citizen.email_normalized,
                citizen_mobile=citizen.mobile_e164,
                persona_type=persona.persona_type,
                persona_type_display=DB_TO_UI_MAP.get(persona.persona_type, persona.persona_type),
                status=persona.status,
                applied_at=approval.created_at,
            )
        )
    return PersonaApplicationListResponse(total=len(items), data=items)


@router.post(
    "/persona-applications/{persona_id}/decide",
    summary="Approve or reject a persona application",
)
def decide_persona_application(
    persona_id: uuid.UUID,
    req: PersonaAdminDecisionRequest,
    reviewer_id: Optional[uuid.UUID] = Query(None, description="Optional admin citizen ID"),
    db: Session = Depends(get_db),
):
    service = PersonaService(db)
    result = service.admin_decide_persona(
        persona_id=persona_id,
        decision=req.decision,
        reviewer_citizen_id=reviewer_id,
        reason_code=req.reason_code,
    )
    logger.info("Admin decided persona %s -> %s", persona_id, req.decision)
    return result


@router.post(
    "/kyc/{record_id}/review",
    summary="Review and verify/reject a KYC record",
)
def review_kyc_record(
    record_id: uuid.UUID,
    req: KycAdminReviewRequest,
    reviewer_id: Optional[uuid.UUID] = Query(None, description="Optional admin citizen ID"),
    db: Session = Depends(get_db),
):
    repo = KycRepository(db)
    record = repo.update_status(
        record_id=record_id,
        status=req.decision,
        tier=req.kyc_tier or ("T1" if req.decision == "VERIFIED" else None),
        reviewer_id=reviewer_id,
        reason_code=req.reason_code,
    )
    if not record:
        raise NotFoundException("KYC record not found")
    db.commit()
    logger.info("Admin reviewed KYC record %s -> %s (tier: %s)", record_id, req.decision, record.kyc_tier)
    return {
        "success": True,
        "message": f"KYC record {record_id} marked as {req.decision}",
        "kyc_record_id": str(record.id),
        "status": record.status,
        "kyc_tier": record.kyc_tier,
        "reviewed_at": record.reviewed_at.isoformat() if record.reviewed_at else None,
    }


@router.get(
    "/audit",
    response_model=AuditLogListResponse,
    summary="Query audit logs",
)
def get_audit_logs(
    citizen_id: Optional[uuid.UUID] = Query(None),
    actor_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    repo = AdminRepository(db)
    logs = repo.list_audit_logs(
        citizen_id=citizen_id,
        actor_type=actor_type,
        action=action,
        limit=limit,
        offset=offset,
    )
    items = []
    for log in logs:
        items.append(
            AuditLogItem(
                id=log.id,
                citizen_id=log.citizen_id,
                actor_type=log.actor_type,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                request_id=log.request_id,
                ip_address=str(log.ip_address) if log.ip_address else None,
                details=log.details or {},
                created_at=log.created_at,
            )
        )
    return AuditLogListResponse(total=len(items), data=items)


@router.get(
    "/limits",
    response_model=WalletLimitListResponse,
    summary="List wallet transaction limits",
)
def get_wallet_limits(
    kyc_tier: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    repo = AdminRepository(db)
    limits = repo.list_wallet_limits(kyc_tier=kyc_tier)
    items = [WalletLimitItem.model_validate(lim) for lim in limits]
    return WalletLimitListResponse(total=len(items), data=items)
