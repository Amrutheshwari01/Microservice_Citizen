import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, update, and_
from sqlalchemy.orm import Session

from app.models.persona import Persona, PersonaApproval


class PersonaRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all_for_citizen(self, citizen_id: uuid.UUID) -> List[Persona]:
        stmt = select(Persona).where(
            Persona.citizen_id == citizen_id
        ).order_by(Persona.created_at.asc())
        return list(self.db.scalars(stmt).all())

    def get_by_id(self, persona_id: uuid.UUID) -> Optional[Persona]:
        stmt = select(Persona).where(Persona.id == persona_id)
        return self.db.scalars(stmt).first()

    def get_by_citizen_and_type(
        self, citizen_id: uuid.UUID, persona_type: str
    ) -> Optional[Persona]:
        stmt = select(Persona).where(
            and_(
                Persona.citizen_id == citizen_id,
                Persona.persona_type == persona_type,
            )
        )
        return self.db.scalars(stmt).first()

    def create_persona(
        self,
        citizen_id: uuid.UUID,
        persona_type: str,
        status: str,
        is_default: bool = False,
        display_name: Optional[str] = None,
    ) -> Persona:
        persona = Persona(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            persona_type=persona_type,
            status=status,
            is_default=is_default,
            display_name=display_name,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(persona)
        self.db.flush()
        return persona

    def create_approval(
        self,
        persona_id: uuid.UUID,
        decision: str = "PENDING",
        reviewer_citizen_id: Optional[uuid.UUID] = None,
        reason_code: Optional[str] = None,
    ) -> PersonaApproval:
        approval = PersonaApproval(
            id=uuid.uuid4(),
            persona_id=persona_id,
            decision=decision,
            reviewer_citizen_id=reviewer_citizen_id,
            reason_code=reason_code,
            reviewed_at=datetime.utcnow() if decision in ("APPROVED", "REJECTED") else None,
            created_at=datetime.utcnow(),
        )
        self.db.add(approval)
        self.db.flush()
        return approval

    def clear_default_for_citizen(self, citizen_id: uuid.UUID) -> None:
        stmt = (
            update(Persona)
            .where(
                and_(
                    Persona.citizen_id == citizen_id,
                    Persona.is_default == True,
                )
            )
            .values(is_default=False)
        )
        self.db.execute(stmt)
        self.db.flush()

    def set_status(self, persona_id: uuid.UUID, status: str) -> Optional[Persona]:
        persona = self.get_by_id(persona_id)
        if persona:
            persona.status = status
            persona.updated_at = datetime.utcnow()
            self.db.flush()
        return persona

    def get_latest_approval(self, persona_id: uuid.UUID) -> Optional[PersonaApproval]:
        stmt = (
            select(PersonaApproval)
            .where(PersonaApproval.persona_id == persona_id)
            .order_by(PersonaApproval.created_at.desc())
        )
        return self.db.scalars(stmt).first()

    def get_pending_approvals(self) -> List[PersonaApproval]:
        """Admin: get all PENDING approval records."""
        stmt = (
            select(PersonaApproval)
            .where(PersonaApproval.decision == "PENDING")
            .order_by(PersonaApproval.created_at.asc())
        )
        return list(self.db.scalars(stmt).all())
