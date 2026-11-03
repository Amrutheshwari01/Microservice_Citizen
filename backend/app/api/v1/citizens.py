from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.dependencies import get_db
from app.api.v1.dependencies import get_current_citizen
from app.models.citizen import Citizen
from app.services.citizen_service import CitizenService
from app.schemas.citizen import ProfileUpdateRequest

logger = logging.getLogger("cis.citizens")

router = APIRouter(prefix="/citizens", tags=["Citizen Profile"])

# ── Allowed avatar types and max size (2 MB) ──────────────────────────────────
_ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


@router.get(
    "/me",
    summary="Get my full profile",
    description="Returns the authenticated citizen's profile, personas, KYC tier, and wallet summary.",
)
def get_my_profile(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = CitizenService(db)
    profile = service.get_full_profile(citizen)
    return {
        "success": True,
        "data": profile,
    }


@router.patch(
    "/me",
    summary="Update my profile",
    description="Partially update citizen profile fields. All fields are optional. Changes are tracked in profile_change_history.",
)
def update_my_profile(
    req: ProfileUpdateRequest,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = CitizenService(db)
    updated = service.update_profile(citizen, req)
    return {
        "success": True,
        "message": "Profile updated successfully.",
        "data": updated,
    }


@router.get(
    "/me/history",
    summary="Get profile change history",
    description="Returns a chronological log of profile changes made by the citizen.",
)
def get_my_history(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = CitizenService(db)
    history = service.get_profile_history(citizen)
    return {
        "success": True,
        "data": history,
    }


@router.post(
    "/me/avatar",
    status_code=status.HTTP_200_OK,
    summary="Upload or replace profile photo",
    description=(
        "Upload a JPEG, PNG, or WebP image (max 2 MB). "
        "The file is stored in Supabase Storage and the signed URL "
        "is saved to `citizen_profiles.profile_photo_ref`."
    ),
)
def upload_avatar(
    file: UploadFile = File(..., description="Profile photo (JPEG/PNG/WebP, max 2 MB)"),
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    """Upload a profile photo to Supabase Storage.

    - Validates content-type and file size.
    - Stores the file under ``avatars/<citizen_id>/<uuid>.<ext>``.
    - Updates ``citizen_profiles.profile_photo_ref`` with the storage key.
    - Returns the storage key (not a public URL — use a signed URL endpoint to download).
    """
    # ── Validate content type ─────────────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{content_type}'. Allowed: JPEG, PNG, WebP.",
        )

    # ── Read and size-check ───────────────────────────────────────────────────
    content: bytes = file.file.read()
    if len(content) > _MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({len(content) // 1024} KB). Maximum allowed: 2 MB.",
        )

    # ── Derive storage key ────────────────────────────────────────────────────
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map.get(content_type, "jpg")
    storage_key = f"{citizen.id}/{uuid.uuid4().hex}.{ext}"

    # ── Upload to Supabase Storage ─────────────────────────────────────────────
    storage_ref: str = storage_key  # default: use the key itself as ref
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client  # type: ignore[import]

            sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            bucket = settings.SUPABASE_STORAGE_BUCKET_AVATARS

            # Upsert so re-uploading doesn't error
            sb.storage.from_(bucket).upload(
                path=storage_key,
                file=content,
                file_options={"content-type": content_type, "upsert": "true"},
            )
            logger.info(
                "Avatar uploaded for citizen %s → bucket=%s key=%s",
                citizen.id,
                bucket,
                storage_key,
            )
        except Exception as exc:
            logger.error("Supabase Storage upload failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Storage upload failed: {exc}",
            )
    else:
        logger.warning(
            "SUPABASE_URL/KEY not configured — avatar stored as metadata-only "
            "(storage_key=%s)",
            storage_key,
        )

    # ── Persist storage key to DB ─────────────────────────────────────────────
    if citizen.profile:
        citizen.profile.profile_photo_ref = storage_ref
        db.commit()
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Citizen profile record missing. Contact support.",
        )

    return {
        "success": True,
        "message": "Profile photo updated successfully.",
        "data": {
            "storage_key": storage_ref,
            "content_type": content_type,
            "size_bytes": len(content),
        },
    }
