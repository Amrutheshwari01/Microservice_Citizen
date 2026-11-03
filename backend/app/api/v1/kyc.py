from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_current_citizen
from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.db.dependencies import get_db
from app.models.citizen import Citizen
from app.repositories.kyc_repo import KycRepository
from app.schemas.kyc import (
    ALLOWED_CONTENT_TYPES,
    ALLOWED_DOCUMENT_TYPES,
    MAX_FILE_SIZE_BYTES,
)
from app.services.citizen_service import KycService

logger = logging.getLogger("cis.kyc")

router = APIRouter(prefix="/kyc", tags=["KYC & Documents"])

# Signed URL lifetime in seconds (5 minutes)
_SIGNED_URL_TTL = 300


def _safe_storage_key(
    citizen_id: uuid.UUID, document_type: str, original_filename: str
) -> str:
    """Generates a non-guessable, non-conflicting Supabase Storage object key.

    Format: ``kyc/<citizen_id>/<doc_type_lower>/<random_hex>.<ext>``
    """
    unique_id = secrets.token_hex(16)
    ext = (
        original_filename.rsplit(".", 1)[-1].lower()
        if "." in original_filename
        else "bin"
    )
    return f"kyc/{citizen_id}/{document_type.lower()}/{unique_id}.{ext}"


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
        "Returns the current KYC tier, overall status, and document count "
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
    summary="Upload a KYC document",
    description=(
        "Uploads a KYC document (JPEG / PNG / PDF, max 5 MB) to Supabase Storage "
        "in a private bucket. Metadata is recorded in `kyc_documents`. "
        "The document number is stored as a one-way token — plaintext is never persisted."
    ),
)
async def upload_kyc_document(
    document_type: str = Form(
        ..., description=f"Document category. One of: {sorted(ALLOWED_DOCUMENT_TYPES)}"
    ),
    document_number: Optional[str] = Form(
        None,
        description=(
            "Document identifier (e.g. Aadhaar number, PAN). "
            "Tokenised with SHA-256 before storage — never stored as plaintext."
        ),
    ),
    file: UploadFile = File(..., description="Document image (JPEG/PNG) or PDF"),
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    # ── Validate document type ────────────────────────────────────────────────
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        raise BadRequestException(
            f"Invalid document_type '{document_type}'. "
            f"Allowed values: {sorted(ALLOWED_DOCUMENT_TYPES)}"
        )

    # ── Validate MIME type ────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise BadRequestException(
            f"Unsupported file type '{file.content_type}'. "
            "Allowed: image/jpeg, image/png, application/pdf"
        )

    # ── Read and size-check ───────────────────────────────────────────────────
    content = await file.read()
    if len(content) == 0:
        raise BadRequestException("Uploaded file is empty.")
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise BadRequestException(
            f"File too large ({len(content) // 1024} KB). "
            f"Maximum allowed: {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        )

    # ── Generate storage key ──────────────────────────────────────────────────
    storage_key = _safe_storage_key(
        citizen.id, document_type, file.filename or "document"
    )

    # ── Upload to Supabase Storage ─────────────────────────────────────────────
    sb = _get_supabase_client()
    if sb:
        try:
            sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET_KYC).upload(
                path=storage_key,
                file=content,
                file_options={
                    "content-type": file.content_type,
                    "upsert": "false",  # never overwrite an existing key
                },
            )
            logger.info(
                "KYC document uploaded: citizen=%s type=%s key=%s",
                citizen.id,
                document_type,
                storage_key,
            )
        except Exception as exc:
            logger.error("Supabase Storage upload failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Document storage upload failed: {exc}",
            )
    else:
        logger.warning(
            "Supabase Storage not configured — metadata saved, file NOT uploaded. "
            "storage_key=%s",
            storage_key,
        )

    # ── Tokenise document number ──────────────────────────────────────────────
    doc_number_token = (
        _tokenize_doc_number(document_number) if document_number else None
    )

    # ── Persist metadata in DB ────────────────────────────────────────────────
    service = KycService(db)
    result = service.upload_document(
        citizen=citizen,
        document_type=document_type,
        storage_object_key=storage_key,
        original_filename=file.filename or "document",
        content_type=file.content_type,
        file_size_bytes=len(content),
        document_number_token=doc_number_token,
    )
    return result


@router.get(
    "/documents/{document_id}/signed-url",
    summary="Get a time-limited signed URL for a KYC document",
    description=(
        f"Generates a {_SIGNED_URL_TTL}-second signed URL for a private KYC document "
        "stored in Supabase Storage. Only the document owner may request this URL."
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

    # ── Fallback when Storage is not configured (dev mode) ────────────────────
    return {
        "success": True,
        "document_id": str(document_id),
        "storage_key": doc.storage_object_key,
        "signed_url": None,
        "note": (
            "Supabase Storage is not configured. "
            "Set SUPABASE_URL and SUPABASE_KEY in .env to enable signed URLs."
        ),
        "expires_in_seconds": _SIGNED_URL_TTL,
    }
