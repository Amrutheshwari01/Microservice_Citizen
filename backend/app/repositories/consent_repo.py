"""Repository for citizen consent records.

Provides CRUD operations on the `consents` table.
All consent changes are append-aware: withdrawing a consent sets
`granted=False` and records a `withdrawn_at` timestamp rather than
deleting the record, preserving the audit trail.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.citizen import Consent


class ConsentRepository:
    """Database access layer for `consents`."""

    def __init__(self, db: Session):
        self._db = db

    # ── Queries ──────────────────────────────────────────────────────────────

    def list_for_citizen(self, citizen_id: uuid.UUID) -> List[Consent]:
        """Return all consent records for a citizen, newest first."""
        stmt = (
            select(Consent)
            .where(Consent.citizen_id == citizen_id)
            .order_by(Consent.captured_at.desc())
        )
        return list(self._db.scalars(stmt).all())

    def get_by_id(
        self, consent_id: uuid.UUID, citizen_id: uuid.UUID
    ) -> Optional[Consent]:
        """Fetch a single consent that belongs to the citizen."""
        stmt = select(Consent).where(
            Consent.id == consent_id,
            Consent.citizen_id == citizen_id,
        )
        return self._db.scalars(stmt).first()

    # ── Mutations ────────────────────────────────────────────────────────────

    def update_consent(
        self,
        consent_id: uuid.UUID,
        citizen_id: uuid.UUID,
        granted: bool,
    ) -> Optional[Consent]:
        """Grant or withdraw a consent.

        - If granting: clears ``withdrawn_at``.
        - If withdrawing: sets ``withdrawn_at = now()``.
        Returns ``None`` if the consent does not exist / belong to the citizen.
        """
        consent = self.get_by_id(consent_id, citizen_id)
        if consent is None:
            return None

        consent.granted = granted
        consent.withdrawn_at = None if granted else datetime.utcnow()
        self._db.flush()
        self._db.refresh(consent)
        return consent
