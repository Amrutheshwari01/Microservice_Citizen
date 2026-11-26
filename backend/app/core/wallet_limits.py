from decimal import Decimal
from typing import Dict
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.citizen import CitizenProfile
from app.models.kyc import KycRecord

KYC_MAX_BALANCE: Dict[str, Decimal] = {
    "T0": Decimal("10000"),
    "T1": Decimal("100000"),
    "T2": Decimal("1000000"),
}


def get_kyc_max_balance(db: Session, citizen_id: uuid.UUID) -> Decimal:
    stmt = (
        select(KycRecord)
        .where(KycRecord.citizen_id == citizen_id)
        .order_by(KycRecord.submitted_at.desc())
    )
    kyc = db.scalars(stmt).first()
    tier = kyc.kyc_tier if kyc else "T0"
    return KYC_MAX_BALANCE.get(tier, KYC_MAX_BALANCE["T0"])


def get_effective_max_balance(db: Session, citizen_id: uuid.UUID) -> Decimal:
    kyc_max = get_kyc_max_balance(db, citizen_id)
    profile = db.get(CitizenProfile, citizen_id)
    preference = profile.wallet_max_balance if profile else None
    return min(Decimal(str(preference)), kyc_max) if preference is not None else kyc_max
