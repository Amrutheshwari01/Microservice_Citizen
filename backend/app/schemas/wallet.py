"""
Wallet, transaction, hold, and internal operation schemas.
All financial amounts are Decimal strings to prevent float representation errors.
"""

import uuid
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class WalletSummaryResponse(BaseModel):
    wallet_id: uuid.UUID
    citizen_id: uuid.UUID
    currency_code: str
    status: str
    available_balance: str  # Stringified Decimal
    held_balance: str  # Computed: SUM(active holds)
    total_balance: str  # available + held
    today_spent: str  # Derived from ledger
    month_spent: str  # Derived from ledger
    updated_at: str

    model_config = {"from_attributes": True}


class TransactionResponse(BaseModel):
    id: uuid.UUID
    transaction_type: str
    amount: str
    currency_code: str
    status: str
    description: Optional[str]
    reference_type: Optional[str]
    counterparty_wallet_id: Optional[uuid.UUID]
    created_at: str
    posted_at: Optional[str]
    failure_code: Optional[str]

    model_config = {"from_attributes": True}


class TransferRequest(BaseModel):
    recipient_identifier: str = Field(
        ..., description="Citizen UUID, email, or mobile of recipient"
    )
    amount: Decimal = Field(..., gt=0, description="Transfer amount (positive Decimal)")
    description: Optional[str] = Field(None, max_length=255)
    idempotency_key: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Unique key to prevent duplicate transfers",
    )
    purpose_code: Optional[str] = Field(None, max_length=60)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Transfer amount must be positive")
        if v.as_tuple().exponent < -4:
            raise ValueError("Amount cannot have more than 4 decimal places")
        return v


class TopupRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Top-up amount")
    provider_name: str = Field(
        ..., max_length=80, description="UPI | NETBANKING | CARD"
    )
    provider_reference: Optional[str] = Field(
        None, max_length=200, description="Payment gateway transaction ref"
    )
    idempotency_key: str = Field(..., min_length=8, max_length=100)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Top-up amount must be positive")
        return v


class CashoutRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Cash-out amount")
    beneficiary_reference: str = Field(
        ..., description="Masked account or UPI identifier"
    )
    idempotency_key: str = Field(..., min_length=8, max_length=100)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Cash-out amount must be positive")
        return v


class HoldResponse(BaseModel):
    id: uuid.UUID
    wallet_id: uuid.UUID
    amount: str
    status: str
    reason_code: str
    expires_at: Optional[str]
    created_at: str
    released_at: Optional[str]

    model_config = {"from_attributes": True}


# ── Internal microservice schemas ─────────────────────────────────────────────


class InternalCitizenStatusResponse(BaseModel):
    citizen_id: uuid.UUID
    full_name: str
    status: str
    email_verified: bool
    mobile_verified: bool
    kyc_tier: str
    kyc_status: str
    active_personas: List[str]
    wallet_id: Optional[uuid.UUID]
    wallet_status: Optional[str]


class InternalWalletHoldRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    reason_code: str = Field(..., max_length=60)
    idempotency_key: str = Field(..., min_length=8, max_length=100)
    expires_in_hours: Optional[int] = Field(None, ge=1, le=720)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Hold amount must be positive")
        return v


class InternalWalletCreditRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., max_length=255)
    reference_type: str = Field(..., max_length=60)
    idempotency_key: str = Field(..., min_length=8, max_length=100)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Credit amount must be positive")
        return v


class InternalWalletDebitRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., max_length=255)
    reference_type: str = Field(..., max_length=60)
    idempotency_key: str = Field(..., min_length=8, max_length=100)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Debit amount must be positive")
        return v


class InternalTokenIntrospectRequest(BaseModel):
    token: str = Field(..., description="Access token to validate")


class InternalTokenIntrospectResponse(BaseModel):
    active: bool
    citizen_id: Optional[uuid.UUID]
    full_name: Optional[str]
    status: Optional[str]
    persona: Optional[str]
    expires_at: Optional[str]
    jti: Optional[str]
