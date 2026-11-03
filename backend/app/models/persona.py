import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import (
    String,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.citizen import Citizen


class Persona(Base):
    __tablename__ = "personas"
    __table_args__ = (
        UniqueConstraint("citizen_id", "persona_type", name="uq_citizen_persona"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("citizens.id", ondelete="CASCADE"),
        nullable=False,
    )
    persona_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # FARMER, AGGREGATOR, CUSTOMER, DELIVERY_PARTNER
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING"
    )  # PENDING, ACTIVE, SUSPENDED, REJECTED
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    citizen: Mapped["Citizen"] = relationship("Citizen", back_populates="personas")
    approvals: Mapped[List["PersonaApproval"]] = relationship(
        "PersonaApproval", back_populates="persona", cascade="all, delete-orphan"
    )


class PersonaApproval(Base):
    __tablename__ = "persona_approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    persona_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("personas.id", ondelete="CASCADE"),
        nullable=False,
    )
    reviewer_citizen_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("citizens.id", ondelete="SET NULL"),
        nullable=True,
    )
    decision: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # PENDING, APPROVED, REJECTED
    reason_code: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    persona: Mapped["Persona"] = relationship("Persona", back_populates="approvals")
