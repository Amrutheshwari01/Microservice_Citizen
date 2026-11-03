"""
Citizen profile and address schemas.
Maps to: citizens + citizen_profiles + profile_change_history tables.
"""

import uuid
from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    preferred_language: Optional[str] = Field(None, max_length=20)
    nationality_code: Optional[str] = Field(None, min_length=2, max_length=2)
    date_of_birth: Optional[date] = None
    address_line1: Optional[str] = Field(None, max_length=200)
    address_line2: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    state_region: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)


class ProfileResponse(BaseModel):
    citizen_id: uuid.UUID
    full_name: str
    email: Optional[str]
    mobile: Optional[str]
    status: str
    kyc_tier: str
    kyc_status: str

    # Profile extended
    date_of_birth: Optional[date]
    nationality_code: Optional[str]
    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    state_region: Optional[str]
    postal_code: Optional[str]
    country_code: Optional[str]
    preferred_language: Optional[str]
    profile_photo_ref: Optional[str]

    # Related
    active_personas: List[str]
    wallet_id: Optional[uuid.UUID]
    wallet_status: Optional[str]
    available_balance: Optional[str]  # string to avoid float leak

    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ProfileChangeHistoryItem(BaseModel):
    id: uuid.UUID
    changed_fields: Dict[str, Any]
    reason: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}
