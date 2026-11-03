import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class CitizenBiometric(Base):
    __tablename__ = "citizen_biometrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("citizens.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    biometric_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="FACE"
    )
    embedding: Mapped[Any] = mapped_column(JSONB, nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_name: Mapped[str] = mapped_column(
        String(100), nullable=False, default="huggingface/vit-face"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
