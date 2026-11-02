import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    Text,
    DateTime,
    BigInteger,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class KycRecord(Base):
    __tablename__ = "kyc_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False)
    kyc_tier: Mapped[str] = mapped_column(String(10), nullable=False, default="T0")  # T0, T1, T2
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")  # PENDING, IN_REVIEW, VERIFIED, REJECTED, EXPIRED
    provider_reference: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    reviewed_by_citizen_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="SET NULL"), nullable=True)
    review_reason_code: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    citizen: Mapped["Citizen"] = relationship("Citizen", foreign_keys=[citizen_id], back_populates="kyc_records")
    documents: Mapped[List["KycDocument"]] = relationship("KycDocument", back_populates="kyc_record", cascade="all, delete-orphan")


class KycDocument(Base):
    __tablename__ = "kyc_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kyc_record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("kyc_records.id", ondelete="CASCADE"), nullable=False)
    document_type: Mapped[str] = mapped_column(String(30), nullable=False)
    document_number_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    storage_object_key: Mapped[str] = mapped_column(Text, nullable=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    verification_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    kyc_record: Mapped["KycRecord"] = relationship("KycRecord", back_populates="documents")
