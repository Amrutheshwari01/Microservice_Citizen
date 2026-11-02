import uuid
from datetime import datetime, timezone
from typing import Tuple
from fastapi import Depends, Header, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.security import decode_token, verify_internal_service_key
from app.db.dependencies import get_db
from app.models.citizen import Citizen
from app.repositories.citizen_repo import CitizenRepository

security_bearer = HTTPBearer(auto_error=False)


def get_current_citizen(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> Citizen:
    """Dependency that resolves the authenticated Citizen from the Bearer JWT."""
    if not credentials:
        raise UnauthorizedException("Authentication token required")

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except Exception as exc:
        raise UnauthorizedException(f"Invalid or expired token: {exc}")

    if payload.get("type") != "access":
        raise UnauthorizedException("Access token required")

    jti = payload.get("jti")
    repo = CitizenRepository(db)
    if repo.is_token_revoked(jti):
        raise UnauthorizedException("Token has been revoked. Please log in again.")

    sub = payload.get("sub")
    try:
        citizen_id = uuid.UUID(sub)
    except (ValueError, TypeError):
        raise UnauthorizedException("Malformed token subject")

    citizen = repo.get_by_id(citizen_id)
    if not citizen:
        raise UnauthorizedException("Citizen account not found")

    if citizen.status != "ACTIVE":
        raise ForbiddenException(f"Account is {citizen.status.lower()}")

    return citizen


def get_current_token_meta(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    citizen: Citizen = Depends(get_current_citizen),
) -> Tuple[Citizen, str, datetime]:
    """Returns (citizen, jti, expire_datetime) for token management endpoints like logout."""
    payload = decode_token(credentials.credentials)
    jti = payload.get("jti")
    exp_ts = payload.get("exp")
    exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
    return citizen, jti, exp_dt


def require_internal_service(
    x_service_key: str = Header(..., description="Service-to-service preshared secret or service token"),
) -> bool:
    """
    Validates requests originating from other microservices
    (AgriLink Marketplace and RTO Microservice).
    """
    if not verify_internal_service_key(x_service_key):
        raise ForbiddenException("Invalid internal service credentials")
    return True
