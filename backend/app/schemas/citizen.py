"""
Citizen profile and address schemas.
Maps to: citizens + citizen_profiles + profile_change_history tables.
"""

import uuid
from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class SavedAddress(BaseModel):
    id: Optional[str] = Field(None, max_length=100)
    address_type: Optional[str] = Field(None, max_length=30)
    address_label: Optional[str] = Field(None, max_length=100)
    house_flat_number: Optional[str] = Field(None, max_length=100)
    building_name: Optional[str] = Field(None, max_length=150)
    street_name: Optional[str] = Field(None, max_length=150)
    locality_area: Optional[str] = Field(None, max_length=150)
    landmark: Optional[str] = Field(None, max_length=150)
    city_town: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    state_code: Optional[str] = Field(None, max_length=10)
    postal_code: Optional[str] = Field(None, max_length=20)
    country_code: Optional[str] = Field(None, max_length=2)
    is_default: bool = False

    model_config = {"extra": "forbid"}


class SavedBankAccount(BaseModel):
    id: Optional[str] = Field(None, max_length=100)
    account_holder_name: Optional[str] = Field(None, max_length=150)
    bank_name: Optional[str] = Field(None, max_length=100)
    account_number_masked: Optional[str] = Field(None, max_length=40)
    ifsc_code: Optional[str] = Field(None, max_length=11)
    branch_name: Optional[str] = Field(None, max_length=100)
    account_type: Optional[str] = Field(None, max_length=20)
    proof_document_type: Optional[str] = Field(None, max_length=40)
    verification_status: Optional[str] = Field(None, max_length=20)
    is_primary: bool = False
    created_at: Optional[str] = Field(None, max_length=50)

    model_config = {"extra": "forbid"}


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = Field(None, max_length=254)
    mobile: Optional[str] = Field(None, max_length=24)
    preferred_language: Optional[str] = Field(None, max_length=20)
    nationality_code: Optional[str] = Field(None, min_length=2, max_length=2)
    date_of_birth: Optional[date] = None
    address_line1: Optional[str] = Field(None, max_length=200)
    address_line2: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    state_region: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    gender: Optional[str] = Field(None, max_length=30)
    addresses: Optional[List[SavedAddress]] = Field(None, max_length=25)
    bank_accounts: Optional[List[SavedBankAccount]] = Field(None, max_length=10)


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
    gender: Optional[str]
    addresses: List[Dict[str, Any]]
    bank_accounts: List[Dict[str, Any]]

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
