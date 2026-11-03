"""Consent management endpoints.

A citizen can view their consents and toggle them (grant / withdraw).
Consents are NOT deleted — withdrawing sets ``granted=False`` and records
``withdrawn_at``, preserving the audit trail.

Routes:
  GET  /consents        – list all consents for the authenticated citizen
  PATCH /consents/{id}  – grant or withdraw a specific consent
"""

from __future__ import annotations

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_current_citizen
from app.db.dependencies import get_db
from app.models.citizen import Citizen
from app.repositories.consent_repo import ConsentRepository
from app.schemas.consent import (
    ConsentListResponse,
    ConsentResponse,
    ConsentUpdateRequest,
)

logger = logging.getLogger("cis.consents")

router = APIRouter(prefix="/consents", tags=["Consents"])


@router.get(
    "",
    response_model=ConsentListResponse,
    summary="List citizen's consents",
)
def list_consents(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
) -> ConsentListResponse:
    """Return all consent records for the authenticated citizen."""
    repo = ConsentRepository(db)
    consents = repo.list_for_citizen(citizen.id)
    data = [ConsentResponse.model_validate(c) for c in consents]
    return ConsentListResponse(data=data, total=len(data))


@router.patch(
    "/{consent_id}",
    response_model=ConsentResponse,
    summary="Grant or withdraw a consent",
)
def update_consent(
    consent_id: uuid.UUID,
    body: ConsentUpdateRequest,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
) -> ConsentResponse:
    """Grant or withdraw a specific consent.

    - ``granted: true``  → marks the consent as active, clears ``withdrawn_at``
    - ``granted: false`` → withdraws the consent, sets ``withdrawn_at = now()``
    """
    repo = ConsentRepository(db)
    updated = repo.update_consent(consent_id, citizen.id, body.granted)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Consent {consent_id} not found.",
        )
    db.commit()
    logger.info(
        "Consent %s %s by citizen %s",
        consent_id,
        "granted" if body.granted else "withdrawn",
        citizen.id,
    )
    return ConsentResponse.model_validate(updated)
