import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.api.v1.dependencies import get_current_citizen
from app.models.citizen import Citizen
from app.services.citizen_service import PersonaService
from app.schemas.persona import PersonaApplyRequest

router = APIRouter(prefix="/personas", tags=["Persona Management"])


@router.get(
    "",
    summary="List my personas",
    description="Returns all persona records registered to the current citizen, including their approval status.",
)
def list_personas(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = PersonaService(db)
    personas = service.list_personas(citizen)
    return {
        "success": True,
        "data": personas,
    }


@router.post(
    "",
    status_code=201,
    summary="Apply for a persona",
    description=(
        "Request a new persona (CUSTOMER, FARMER, AGGREGATOR, DELIVERY_PARTNER). "
        "CUSTOMER is self-assigned; others require admin approval."
    ),
)
def apply_persona(
    req: PersonaApplyRequest,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = PersonaService(db)
    return service.apply_persona(citizen, req)


@router.post(
    "/{persona_id}/activate",
    summary="Set active/default persona",
    description="Marks a persona as the citizen's current default. Only ACTIVE personas can be activated.",
)
def activate_persona(
    persona_id: uuid.UUID,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = PersonaService(db)
    return service.activate_persona(citizen, persona_id)
