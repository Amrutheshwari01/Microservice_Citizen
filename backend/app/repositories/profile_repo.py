import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session

from app.models.citizen import CitizenProfile, ProfileChangeHistory
from app.models.kyc import KycRecord
from app.models.persona import Persona
from app.models.wallet import Wallet, WalletHold


class CitizenProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_profile(self, citizen_id: uuid.UUID) -> Optional[CitizenProfile]:
        stmt = select(CitizenProfile).where(CitizenProfile.citizen_id == citizen_id)
        return self.db.scalars(stmt).first()

    def update_profile(
        self,
        citizen_id: uuid.UUID,
        fields: Dict[str, Any],
    ) -> Optional[CitizenProfile]:
        profile = self.get_profile(citizen_id)
        if not profile:
            return None
        old_values = {}
        for key, val in fields.items():
            if hasattr(profile, key):
                old_values[key] = getattr(profile, key)
                setattr(profile, key, val)
        profile.updated_at = datetime.utcnow()
        self.db.flush()
        return profile, old_values

    def record_change_history(
        self,
        citizen_id: uuid.UUID,
        changed_fields: Dict[str, Any],
        changed_by_citizen_id: Optional[uuid.UUID] = None,
        reason: Optional[str] = None,
    ) -> ProfileChangeHistory:
        history = ProfileChangeHistory(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            changed_by_citizen_id=changed_by_citizen_id,
            changed_fields=changed_fields,
            reason=reason,
            created_at=datetime.utcnow(),
        )
        self.db.add(history)
        self.db.flush()
        return history

    def get_change_history(
        self,
        citizen_id: uuid.UUID,
        limit: int = 20,
    ) -> List[ProfileChangeHistory]:
        stmt = (
            select(ProfileChangeHistory)
            .where(ProfileChangeHistory.citizen_id == citizen_id)
            .order_by(ProfileChangeHistory.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_kyc_summary(self, citizen_id: uuid.UUID) -> Optional[KycRecord]:
        """Returns the most recent KYC record for a citizen."""
        stmt = (
            select(KycRecord)
            .where(KycRecord.citizen_id == citizen_id)
            .order_by(KycRecord.submitted_at.desc())
        )
        return self.db.scalars(stmt).first()

    def get_active_personas(self, citizen_id: uuid.UUID) -> List[str]:
        stmt = select(Persona.persona_type).where(
            and_(
                Persona.citizen_id == citizen_id,
                Persona.status == "ACTIVE",
            )
        )
        return list(self.db.scalars(stmt).all())

    def get_wallet(
        self, citizen_id: uuid.UUID, currency: str = "INR"
    ) -> Optional[Wallet]:
        stmt = select(Wallet).where(
            and_(
                Wallet.citizen_id == citizen_id,
                Wallet.currency_code == currency,
            )
        )
        return self.db.scalars(stmt).first()

    def get_held_balance(self, wallet_id: uuid.UUID) -> Decimal:
        stmt = select(func.coalesce(func.sum(WalletHold.amount), Decimal("0"))).where(
            and_(
                WalletHold.wallet_id == wallet_id,
                WalletHold.status == "ACTIVE",
            )
        )
        result = self.db.execute(stmt).scalar()
        return Decimal(str(result)) if result else Decimal("0")
