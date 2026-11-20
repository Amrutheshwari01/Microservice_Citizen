from __future__ import annotations

import hashlib
import re
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_current_citizen
from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.db.dependencies import get_db
from app.models.citizen import Citizen
from app.repositories.kyc_repo import KycRepository
from app.schemas.kyc import (
    ALLOWED_DOCUMENT_TYPES,
    KYC_DETAIL_FIELDS,
    REQUIRED_KYC_DETAIL_FIELDS,
    KycDocumentSubmission,
)
from app.services.citizen_service import KycService

logger = logging.getLogger("cis.kyc")

router = APIRouter(prefix="/kyc", tags=["KYC & Documents"])

# Signed URL lifetime for legacy file-backed documents (5 minutes).
_SIGNED_URL_TTL = 300


def _tokenize_doc_number(doc_number: str) -> str:
    """One-way SHA-256 token for the document number.

    The plaintext document number is **never** stored anywhere.
    """
    return hashlib.sha256(
        f"{settings.JWT_SECRET_KEY}:{doc_number}".encode("utf-8")
    ).hexdigest()


def _get_supabase_client():
    """Return a Supabase client, or None if credentials are not configured."""
    if not (settings.SUPABASE_URL and settings.SUPABASE_KEY):
        return None
    try:
        from supabase import create_client  # type: ignore[import]

        return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    except ImportError:
        logger.warning(
            "supabase-py not installed — storage operations will be skipped. "
            "Run: pip install supabase"
        )
        return None


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get(
    "/me",
    summary="Get my KYC status",
    description=(
        "Returns the current KYC tier, review status, and saved document details "
        "for the authenticated citizen."
    ),
)
def get_kyc_status(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = KycService(db)
    return {"success": True, "data": service.get_kyc_status(citizen)}


@router.post(
    "/documents",
    status_code=status.HTTP_201_CREATED,
    summary="Save KYC document details",
    description=(
        "Saves customer-entered document details in PostgreSQL. No image or PDF is "
        "accepted. Document numbers are tokenized and returned only in masked form."
    ),
)
def submit_kyc_document(
    payload: KycDocumentSubmission,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    document_type = payload.document_type
    document_number = payload.document_number

    if document_type not in ALLOWED_DOCUMENT_TYPES:
        raise BadRequestException(
            f"Invalid document_type '{document_type}'. "
            f"Allowed values: {sorted(ALLOWED_DOCUMENT_TYPES)}"
        )

    number_required_types = {
        "PAN",
        "AADHAAR",
        "PASSPORT",
        "VOTER_ID",
        "DRIVING_LICENCE",
        "GST_CERTIFICATE",
        "FARMER_REGISTRATION",
    }
    if document_type in number_required_types and not document_number:
        raise BadRequestException("A document number is required.")

    if document_number:
        clean_doc = document_number.strip().upper()
        if document_type == "PAN" and not re.match(
            r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", clean_doc
        ):
            raise BadRequestException(
                "Invalid PAN format. Must be 10 characters: 5 uppercase letters, 4 digits, 1 letter (e.g. ABCDE1234F)."
            )
        elif document_type == "VOTER_ID" and not re.match(
            r"^[A-Z]{3}[0-9]{7}$", clean_doc
        ):
            raise BadRequestException(
                "Invalid Voter ID (EPIC) format. Must be 3 uppercase letters followed by 7 digits (e.g. KLR1234567)."
            )
        elif document_type == "PASSPORT" and not re.match(
            r"^[A-PR-WYa-pr-wy][1-9]\d{6}$", clean_doc
        ):
            raise BadRequestException(
                "Invalid Indian Passport format. Must start with a letter followed by 7 digits (e.g. A1234567)."
            )
        elif document_type == "GST_CERTIFICATE" and not re.match(
            r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", clean_doc
        ):
            raise BadRequestException(
                "Invalid GSTIN format. Must be 15 alphanumeric characters (e.g. 29ABCDE1234F1Z5)."
            )
        elif document_type == "AADHAAR" and not re.match(
            r"^(?:[2-9]\d{11}|\d{4})$", clean_doc.replace(" ", "")
        ):
            raise BadRequestException(
                "Invalid Aadhaar format. Must be 12 digits or the last 4 masked digits."
            )
        document_number = clean_doc.replace(" ", "")

    allowed_fields = KYC_DETAIL_FIELDS.get(document_type, set())
    unknown_fields = set(payload.details) - allowed_fields
    if unknown_fields:
        raise BadRequestException(
            f"Unsupported details for {document_type}: {sorted(unknown_fields)}"
        )

    details = {}
    for key, value in payload.details.items():
        if isinstance(value, str):
            value = value.strip()
            if len(value) > 500:
                raise BadRequestException(f"{key} must be 500 characters or fewer.")
            if re.search(r"[A-Z]{5}[0-9]{4}[A-Z]", value.upper()) or re.search(
                r"\b[0-9]{12}\b", value
            ):
                raise BadRequestException(
                    "Enter document numbers only in the document number field."
                )
        if value is not None and value != "":
            details[key] = value

    missing_fields = REQUIRED_KYC_DETAIL_FIELDS.get(document_type, set()) - set(details)
    if missing_fields:
        raise BadRequestException(
            f"Missing required details for {document_type}: {sorted(missing_fields)}"
        )
    if document_type == "AADHAAR" and details.get("consent_granted") is not True:
        raise BadRequestException("Aadhaar consent is required.")

    doc_number_token = (
        _tokenize_doc_number(document_number) if document_number else None
    )

    service = KycService(db)
    return service.submit_document(
        citizen=citizen,
        document_type=document_type,
        document_number=document_number,
        details=details,
        document_number_token=doc_number_token,
    )


@router.get(
    "/documents/{document_id}/signed-url",
    summary="Get a time-limited URL for a legacy KYC file",
    description=(
        f"Generates a {_SIGNED_URL_TTL}-second signed URL for a legacy KYC file "
        "stored in Supabase Storage. New KYC submissions store details only."
    ),
)
def get_signed_url(
    document_id: uuid.UUID,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    # ── Authorise: document must belong to this citizen ───────────────────────
    repo = KycRepository(db)
    doc = repo.get_document_by_id(document_id, citizen_id=citizen.id)
    if not doc:
        raise NotFoundException("Document not found or access denied.")
    if not doc.storage_object_key:
        raise NotFoundException("This KYC submission has no stored file.")

    # ── Generate signed URL via Supabase Storage ──────────────────────────────
    sb = _get_supabase_client()
    if sb:
        try:
            response = sb.storage.from_(
                settings.SUPABASE_STORAGE_BUCKET_KYC
            ).create_signed_url(doc.storage_object_key, _SIGNED_URL_TTL)
            signed_url = response.get("signedURL") or response.get("signed_url", "")
            logger.info(
                "Signed URL generated: citizen=%s doc=%s", citizen.id, document_id
            )
            return {
                "success": True,
                "document_id": str(document_id),
                "signed_url": signed_url,
                "expires_in_seconds": _SIGNED_URL_TTL,
            }
        except Exception as exc:
            logger.error("Signed URL generation failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not generate signed URL: {exc}",
            )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Private document storage is not configured.",
    )
