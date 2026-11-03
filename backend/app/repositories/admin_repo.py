"""Repository for Admin queries: audit logs, limits, persona applications."""

from __future__ import annotations

import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.models.citizen import AuditLog, Citizen
from app.models.persona import Persona, PersonaApproval
from app.models.wallet import WalletLimit


class AdminRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_pending_persona_applications(
        self,
    ) -> List[Tuple[PersonaApproval, Persona, Citizen]]:
        """Fetch pending persona approvals joined with persona and citizen info."""
        stmt = (
            select(PersonaApproval, Persona, Citizen)
            .join(Persona, PersonaApproval.persona_id == Persona.id)
            .join(Citizen, Persona.citizen_id == Citizen.id)
            .where(PersonaApproval.decision == "PENDING")
            .order_by(PersonaApproval.created_at.asc())
        )
        return list(self.db.execute(stmt).all())

    def list_audit_logs(
        self,
        citizen_id: Optional[uuid.UUID] = None,
        actor_type: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AuditLog]:
        stmt = select(AuditLog)
        if citizen_id:
            stmt = stmt.where(AuditLog.citizen_id == citizen_id)
        if actor_type:
            stmt = stmt.where(AuditLog.actor_type == actor_type)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        stmt = stmt.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
        return list(self.db.scalars(stmt).all())

    def list_wallet_limits(self, kyc_tier: Optional[str] = None) -> List[WalletLimit]:
        stmt = select(WalletLimit).where(WalletLimit.is_active)
        if kyc_tier:
            stmt = stmt.where(WalletLimit.kyc_tier == kyc_tier)
        stmt = stmt.order_by(WalletLimit.kyc_tier, WalletLimit.persona_type)
        return list(self.db.scalars(stmt).all())
