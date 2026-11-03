import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Numeric,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.citizen import Citizen


class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = (
        UniqueConstraint(
            "citizen_id", "currency_code", name="uq_citizen_wallet_currency"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("citizens.id", ondelete="CASCADE"),
        nullable=False,
    )
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="ACTIVE", nullable=False
    )  # ACTIVE, FROZEN, CLOSED
    available_balance: Mapped[Decimal] = mapped_column(
        Numeric(19, 4), default=Decimal("0.0000"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    citizen: Mapped["Citizen"] = relationship("Citizen", back_populates="wallets")
    transactions: Mapped[List["WalletTransaction"]] = relationship(
        "WalletTransaction",
        foreign_keys="WalletTransaction.wallet_id",
        back_populates="wallet",
    )
    holds: Mapped[List["WalletHold"]] = relationship(
        "WalletHold", back_populates="wallet"
    )
    ledger_entries: Mapped[List["LedgerEntry"]] = relationship(
        "LedgerEntry", back_populates="wallet"
    )


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
    )
    transaction_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # TOPUP, TRANSFER, PURCHASE, REFUND, CASHOUT, HOLD, RELEASE, ADJUSTMENT
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="PENDING", nullable=False
    )  # PENDING, POSTED, FAILED, CANCELLED, REVERSED
    reference_type: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    counterparty_wallet_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wallets.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    initiated_by_citizen_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("citizens.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failure_code: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)

    wallet: Mapped["Wallet"] = relationship(
        "Wallet", foreign_keys=[wallet_id], back_populates="transactions"
    )
    counterparty_wallet: Mapped[Optional["Wallet"]] = relationship(
        "Wallet", foreign_keys=[counterparty_wallet_id]
    )
    ledger_entries: Mapped[List["LedgerEntry"]] = relationship(
        "LedgerEntry", back_populates="transaction", cascade="all, delete-orphan"
    )


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallet_transactions.id", ondelete="CASCADE"),
        nullable=False,
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
    )
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)  # DEBIT, CREDIT
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    balance_after: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(19, 4), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    transaction: Mapped["WalletTransaction"] = relationship(
        "WalletTransaction", back_populates="ledger_entries"
    )
    wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="ledger_entries")


class WalletHold(Base):
    __tablename__ = "wallet_holds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
    )
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallet_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="ACTIVE", nullable=False
    )  # ACTIVE, RELEASED, CAPTURED, EXPIRED, CANCELLED
    reason_code: Mapped[str] = mapped_column(String(60), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    released_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="holds")


class WalletLimit(Base):
    __tablename__ = "wallet_limits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    kyc_tier: Mapped[str] = mapped_column(String(10), nullable=False)  # T0, T1, T2
    persona_type: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )  # FARMER, AGGREGATOR, CUSTOMER, DELIVERY_PARTNER
    operation_type: Mapped[str] = mapped_column(String(30), nullable=False)
    per_transaction_limit: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(19, 4), nullable=True
    )
    daily_limit: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(19, 4), nullable=True
    )
    monthly_limit: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(19, 4), nullable=True
    )
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (
        UniqueConstraint(
            "citizen_id", "idempotency_key", name="uq_citizen_idempotency_key"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("citizens.id", ondelete="CASCADE"),
        nullable=False,
    )
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False)
    request_hash: Mapped[str] = mapped_column(Text, nullable=False)
    operation_type: Mapped[str] = mapped_column(String(40), nullable=False)
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="IN_PROGRESS", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class TopupRequest(Base):
    __tablename__ = "topup_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    provider_name: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    provider_reference: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    wallet_transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallet_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class CashoutRequest(Base):
    __tablename__ = "cashout_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    beneficiary_reference: Mapped[str] = mapped_column(Text, nullable=False)
    provider_reference: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    wallet_transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallet_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class RiskReview(Base):
    __tablename__ = "risk_reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wallet_transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallet_transactions.id", ondelete="CASCADE"),
        nullable=False,
    )
    risk_status: Mapped[str] = mapped_column(
        String(20), default="CLEAR", nullable=False
    )
    risk_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 3), nullable=True)
    reason_codes: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    reviewed_by_citizen_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("citizens.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
