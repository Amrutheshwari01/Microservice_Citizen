"""Pydantic schemas for citizen session management."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class SessionResponse(BaseModel):
    """A single active session record."""

    id: uuid.UUID
    device_label: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    is_current: bool = False

    model_config = {"from_attributes": True}

    @field_validator("ip_address", mode="before")
    @classmethod
    def coerce_ip_address(cls, value: object) -> Optional[str]:
        if value is None:
            return None
        return str(value)


class SessionListResponse(BaseModel):
    success: bool = True
    data: list[SessionResponse]
    total: int


class RevokeOthersResponse(BaseModel):
    success: bool = True
    revoked_count: int
    message: str
