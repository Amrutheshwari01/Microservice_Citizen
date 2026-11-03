"""
Persona schemas.
Maps to: personas + persona_approvals tables.
Frontend alias: BUYER -> CUSTOMER, DELIVERY_PERSON -> DELIVERY_PARTNER
"""

import uuid
from typing import Optional

from pydantic import BaseModel, Field, field_validator

# UI alias → DB value mapping
PERSONA_ALIAS_MAP = {
    "BUYER": "CUSTOMER",
    "DELIVERY_PERSON": "DELIVERY_PARTNER",
    "CUSTOMER": "CUSTOMER",
    "FARMER": "FARMER",
    "AGGREGATOR": "AGGREGATOR",
    "DELIVERY_PARTNER": "DELIVERY_PARTNER",
}

DB_TO_UI_MAP = {
    "CUSTOMER": "BUYER",
    "DELIVERY_PARTNER": "DELIVERY_PERSON",
    "FARMER": "FARMER",
    "AGGREGATOR": "AGGREGATOR",
}

VALID_PERSONA_TYPES = {"CUSTOMER", "FARMER", "AGGREGATOR", "DELIVERY_PARTNER"}

# Personas that require admin approval before activation
RESTRICTED_PERSONA_TYPES = {"FARMER", "AGGREGATOR", "DELIVERY_PARTNER"}


class PersonaApplyRequest(BaseModel):
    persona_type: str = Field(
        ...,
        description="CUSTOMER | BUYER | FARMER | AGGREGATOR | DELIVERY_PARTNER | DELIVERY_PERSON",
    )
    display_name: Optional[str] = Field(None, max_length=120)
    notes: Optional[str] = Field(
        None, max_length=500, description="Additional info for admin review"
    )
    fpo_name: Optional[str] = Field(
        None, max_length=200, description="FPO name for FARMER persona"
    )
    license_ref: Optional[str] = Field(
        None, max_length=100, description="License reference for DELIVERY_PARTNER"
    )

    @field_validator("persona_type")
    @classmethod
    def normalize_persona(cls, v: str) -> str:
        mapped = PERSONA_ALIAS_MAP.get(v.upper())
        if not mapped:
            raise ValueError(
                f"Invalid persona type: {v}. Valid: {list(PERSONA_ALIAS_MAP.keys())}"
            )
        return mapped


class PersonaActivateRequest(BaseModel):
    """Sets a persona as the default active persona."""

    pass


class PersonaResponse(BaseModel):
    id: uuid.UUID
    persona_type: str  # DB value
    persona_type_display: str  # UI alias
    status: str
    is_default: bool
    display_name: Optional[str]
    created_at: str
    updated_at: str
    latest_decision: Optional[str]  # PENDING | APPROVED | REJECTED

    model_config = {"from_attributes": True}


class PersonaAdminDecisionRequest(BaseModel):
    decision: str = Field(..., description="APPROVED or REJECTED")
    reason_code: Optional[str] = Field(None, max_length=60)

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        if v.upper() not in {"APPROVED", "REJECTED"}:
            raise ValueError("decision must be APPROVED or REJECTED")
        return v.upper()


class PersonaApprovalResponse(BaseModel):
    id: uuid.UUID
    persona_id: uuid.UUID
    decision: str
    reason_code: Optional[str]
    reviewed_at: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}
