"""Repository for citizen session management.

Provides queries and revocation helpers for the `citizen_sessions` table.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.citizen import CitizenSession


class SessionRepository:
    """Database access layer for `citizen_sessions`."""

    def __init__(self, db: Session):
        self._db = db

    # ── Queries ──────────────────────────────────────────────────────────────

    def list_active(self, citizen_id: uuid.UUID) -> List[CitizenSession]:
        """Return all non-revoked sessions for a citizen, newest first."""
        stmt = (
            select(CitizenSession)
            .where(
                CitizenSession.citizen_id == citizen_id,
                CitizenSession.revoked_at.is_(None),
            )
            .order_by(CitizenSession.created_at.desc())
        )
        return list(self._db.scalars(stmt).all())

    def get_by_id(
        self, session_id: uuid.UUID, citizen_id: uuid.UUID
    ) -> Optional[CitizenSession]:
        """Fetch a single session that belongs to the citizen."""
        stmt = select(CitizenSession).where(
            CitizenSession.id == session_id,
            CitizenSession.citizen_id == citizen_id,
        )
        return self._db.scalars(stmt).first()

    # ── Mutations ────────────────────────────────────────────────────────────

    def revoke(self, session_id: uuid.UUID, citizen_id: uuid.UUID) -> bool:
        """Revoke a single session. Returns True if found and revoked."""
        session = self.get_by_id(session_id, citizen_id)
        if session is None or session.revoked_at is not None:
            return False
        session.revoked_at = datetime.utcnow()
        self._db.flush()
        return True

    def revoke_all_except(
        self, citizen_id: uuid.UUID, current_session_id: uuid.UUID
    ) -> int:
        """Revoke every non-current active session. Returns count revoked."""
        sessions = self.list_active(citizen_id)
        now = datetime.utcnow()
        count = 0
        for s in sessions:
            if s.id != current_session_id:
                s.revoked_at = now
                count += 1
        if count:
            self._db.flush()
        return count
