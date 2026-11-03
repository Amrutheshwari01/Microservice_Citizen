"""
KYC and document schemas.
Maps to: kyc_records + kyc_documents tables.
Files stored in Supabase Storage; only metadata in PostgreSQL.
"""
import uuid
from datetime import datetime
from typing import Optional

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

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
}

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


class KycStatusResponse(BaseModel):
    citizen_id: uuid.UUID
    kyc_tier: str       # T0, T1, T2
    status: str         # PENDING, IN_REVIEW, VERIFIED, REJECTED, EXPIRED
    submitted_at: Optional[str]
    reviewed_at: Optional[str]
    expires_at: Optional[str]
    review_reason_code: Optional[str]
    documents_count: int

    model_config = {"from_attributes": True}


class KycDocumentResponse(BaseModel):
    id: uuid.UUID
    kyc_record_id: uuid.UUID
    document_type: str
    original_filename: Optional[str]
    content_type: str
    file_size_bytes: int
    verification_status: str
    uploaded_at: str
    verified_at: Optional[str]
    # storage_object_key intentionally NOT returned to clients

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
