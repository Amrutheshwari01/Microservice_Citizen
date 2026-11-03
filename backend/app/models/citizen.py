import uuid
from datetime import datetime
from typing import Optional, List, Any
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Date,
    Integer,
    Boolean,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Citizen(Base):
    __tablename__ = "citizens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email_normalized: Mapped[Optional[str]] = mapped_column(String(254), unique=True, nullable=True)
    mobile_e164: Mapped[Optional[str]] = mapped_column(String(16), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    mobile_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    profile: Mapped[Optional["CitizenProfile"]] = relationship("CitizenProfile", back_populates="citizen", uselist=False, cascade="all, delete-orphan")
    credentials: Mapped[Optional["Credential"]] = relationship("Credential", back_populates="citizen", uselist=False, cascade="all, delete-orphan")
    personas: Mapped[List["Persona"]] = relationship("Persona", back_populates="citizen", cascade="all, delete-orphan")
    wallets: Mapped[List["Wallet"]] = relationship("Wallet", back_populates="citizen", cascade="all, delete-orphan")
    kyc_records: Mapped[List["KycRecord"]] = relationship("KycRecord", foreign_keys="KycRecord.citizen_id", back_populates="citizen", cascade="all, delete-orphan")
    sessions: Mapped[List["CitizenSession"]] = relationship("CitizenSession", back_populates="citizen", cascade="all, delete-orphan")
    consents: Mapped[List["Consent"]] = relationship("Consent", back_populates="citizen", cascade="all, delete-orphan")


class CitizenProfile(Base):
    __tablename__ = "citizen_profiles"

    citizen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), primary_key=True)
    date_of_birth: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    nationality_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True, default="IN")
    address_line1: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state_region: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True, default="IN")
    preferred_language: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="en")
    profile_photo_ref: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    citizen: Mapped["Citizen"] = relationship("Citizen", back_populates="profile")


class Credential(Base):
    __tablename__ = "credentials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    password_changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    citizen: Mapped["Citizen"] = relationship("Citizen", back_populates="credentials")


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=True)
    purpose: Mapped[str] = mapped_column(String(30), nullable=False)  # REGISTER, LOGIN, RECOVERY, CONTACT_VERIFY
    destination_masked: Mapped[str] = mapped_column(String(254), nullable=False)
    code_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consumed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class ContactVerification(Base):
    __tablename__ = "contact_verifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(10), nullable=False)  # EMAIL, SMS
    destination_hash: Mapped[str] = mapped_column(Text, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class CitizenSession(Base):
    __tablename__ = "citizen_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False)
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_label: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    citizen: Mapped["Citizen"] = relationship("Citizen", back_populates="sessions")


class TokenRevocation(Base):
    __tablename__ = "token_revocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False)
    token_jti: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    reason_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False)
    consent_type: Mapped[str] = mapped_column(String(40), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    policy_version: Mapped[str] = mapped_column(String(40), nullable=False, default="1.0")
    granted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    citizen: Mapped["Citizen"] = relationship("Citizen", back_populates="consents")


class ProfileChangeHistory(Base):
    __tablename__ = "profile_change_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="CASCADE"), nullable=False)
    changed_by_citizen_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    changed_fields: Mapped[dict] = mapped_column(JSONB, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("citizens.id", ondelete="SET NULL"), nullable=True)
    actor_type: Mapped[str] = mapped_column(String(20), nullable=False)  # CITIZEN, ADMIN, SYSTEM, SERVICE
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(INET, nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
