"""KYC document-detail schemas."""

import uuid
from typing import List, Optional, Union

from pydantic import BaseModel, Field, field_validator

ALLOWED_DOCUMENT_TYPES = {
    "AADHAAR",
    "PAN",
    "PASSPORT",
    "VOTER_ID",
    "DRIVING_LICENCE",
    "GST_CERTIFICATE",
    "BUSINESS_REGISTRATION",
    "BANK_PROOF",
    "FARMER_REGISTRATION",
    "LAND_RECORDS",
    "VEHICLE_RC",
    "VEHICLE_INSURANCE",
    "OTHER",
}

KYC_DETAIL_FIELDS = {
    "PAN": {"name_on_pan"},
    "AADHAAR": {"name_on_aadhaar", "consent_granted"},
    "PASSPORT": {"given_names", "expiry_date"},
    "VOTER_ID": {"name_on_voter_id", "state", "assembly_constituency"},
    "DRIVING_LICENCE": {"issuing_state_code", "vehicle_classes"},
    "GST_CERTIFICATE": {"legal_business_name"},
    "FARMER_REGISTRATION": {"certificate_type", "land_area_acres", "district"},
}

REQUIRED_KYC_DETAIL_FIELDS = {
    "PAN": {"name_on_pan"},
    "AADHAAR": {"name_on_aadhaar", "consent_granted"},
    "VOTER_ID": {"name_on_voter_id", "state"},
    "PASSPORT": {"given_names", "expiry_date"},
    "GST_CERTIFICATE": {"legal_business_name"},
}


class KycDocumentSubmission(BaseModel):
    document_type: str
    document_number: Optional[str] = Field(default=None, max_length=100)
    details: dict[str, Union[str, bool, None]] = Field(default_factory=dict)

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in ALLOWED_DOCUMENT_TYPES:
            raise ValueError(f"Unsupported document type: {normalized}")
        return normalized

    @field_validator("document_number")
    @classmethod
    def normalize_document_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip().upper()


class KycDocumentStatusItem(BaseModel):
    document_id: uuid.UUID
    document_type: str
    document_number_masked: Optional[str]
    details: dict[str, Union[str, bool, None]]
    verification_status: str
    uploaded_at: str


class KycStatusResponse(BaseModel):
    citizen_id: uuid.UUID
    kyc_tier: str  # T0, T1, T2
    status: str  # PENDING, IN_REVIEW, VERIFIED, REJECTED, EXPIRED
    submitted_at: Optional[str]
    reviewed_at: Optional[str]
    expires_at: Optional[str]
    review_reason_code: Optional[str]
    documents_count: int
    documents: List[KycDocumentStatusItem]

    model_config = {"from_attributes": True}


class KycDocumentResponse(BaseModel):
    id: uuid.UUID
    kyc_record_id: uuid.UUID
    document_type: str
    document_number_masked: Optional[str]
    details: dict[str, Union[str, bool, None]]
    verification_status: str
    uploaded_at: str
    verified_at: Optional[str]

    model_config = {"from_attributes": True}


class KycAdminReviewRequest(BaseModel):
    kyc_record_id: Optional[uuid.UUID] = None
    decision: str = Field(..., description="VERIFIED or REJECTED")
    reason_code: Optional[str] = Field(None, max_length=60)
    kyc_tier: Optional[str] = Field(None, description="T0, T1, or T2")

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        if v.upper() not in {"VERIFIED", "REJECTED", "IN_REVIEW"}:
            raise ValueError("decision must be VERIFIED, IN_REVIEW, or REJECTED")
        return v.upper()
