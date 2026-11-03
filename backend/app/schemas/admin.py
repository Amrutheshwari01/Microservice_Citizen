"""Schemas for Admin operations (approvals, audit logs, limits)."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PersonaApplicationItem(BaseModel):
    approval_id: uuid.UUID
    persona_id: uuid.UUID
    citizen_id: uuid.UUID
    citizen_name: str
    citizen_email: Optional[str] = None
    citizen_mobile: Optional[str] = None
    persona_type: str
    persona_type_display: str
    status: str
    applied_at: datetime

    model_config = {"from_attributes": True}


class PersonaApplicationListResponse(BaseModel):
    success: bool = True
    total: int
    data: List[PersonaApplicationItem]


class AuditLogItem(BaseModel):
    id: uuid.UUID
    citizen_id: Optional[uuid.UUID] = None
    actor_type: str
    action: str
    entity_type: str
    entity_id: Optional[uuid.UUID] = None
    request_id: Optional[str] = None
    ip_address: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    success: bool = True
    total: int
    data: List[AuditLogItem]


class WalletLimitItem(BaseModel):
    id: uuid.UUID
    kyc_tier: str
    persona_type: str
    operation_type: str
    per_transaction_limit: Decimal
    daily_limit: Decimal
    monthly_limit: Decimal
    currency_code: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WalletLimitListResponse(BaseModel):
    success: bool = True
    total: int
    data: List[WalletLimitItem]
