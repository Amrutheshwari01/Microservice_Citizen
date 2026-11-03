"""Pydantic schemas for citizen consent management."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ConsentResponse(BaseModel):
    """A single consent record returned to the frontend."""

    id: uuid.UUID
    consent_type: str
    purpose: str
    policy_version: str
    granted: bool
    captured_at: datetime
    withdrawn_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConsentUpdateRequest(BaseModel):
    """Toggle or update a consent record."""

    granted: bool = Field(..., description="Set True to grant, False to withdraw consent")


class ConsentListResponse(BaseModel):
    """Paginated list of consents."""

    success: bool = True
    data: list[ConsentResponse]
    total: int
