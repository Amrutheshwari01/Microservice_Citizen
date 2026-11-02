"""Session management endpoints.

Citizens can view their active sessions and revoke them remotely
(useful for "sign out everywhere" or revoking a compromised device).

Routes:
  GET    /sessions                 – list all active sessions
  DELETE /sessions/{id}            – revoke a specific session
  POST   /sessions/revoke-others   – revoke all sessions except the current one
"""
from __future__ import annotations

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_current_citizen
from app.core.security import decode_token
from app.db.dependencies import get_db
from app.models.citizen import Citizen
from app.repositories.session_repo import SessionRepository
from app.schemas.session import SessionListResponse, SessionResponse, RevokeOthersResponse

logger = logging.getLogger("cis.sessions")

router = APIRouter(prefix="/sessions", tags=["Sessions"])
_bearer = HTTPBearer(auto_error=False)


def _current_session_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> uuid.UUID:
    """Extract the ``sid`` claim from the access token, if present."""
    if not credentials:
        return uuid.UUID(int=0)
    try:
        payload = decode_token(credentials.credentials)
        sid_str = payload.get("sid")
        return uuid.UUID(sid_str) if sid_str else uuid.UUID(int=0)
    except Exception:
        return uuid.UUID(int=0)


@router.get(
    "",
    response_model=SessionListResponse,
    summary="List active sessions",
)
def list_sessions(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
) -> SessionListResponse:
    """Return all non-revoked sessions for the authenticated citizen."""
    repo = SessionRepository(db)
    sessions = repo.list_active(citizen.id)
    data = [SessionResponse.model_validate(s) for s in sessions]
    return SessionListResponse(data=data, total=len(data))


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a specific session",
)
def revoke_session(
    session_id: uuid.UUID,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
) -> None:
    """Revoke (sign out) a single session by its ID.

    This immediately invalidates the refresh token associated with that session.
    The access token issued for it will expire naturally (within its TTL).
    """
    repo = SessionRepository(db)
    revoked = repo.revoke(session_id, citizen.id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active session {session_id} not found.",
        )
    db.commit()
    logger.info("Session %s revoked by citizen %s", session_id, citizen.id)


@router.post(
    "/revoke-others",
    response_model=RevokeOthersResponse,
    summary="Revoke all sessions except the current one",
)
def revoke_other_sessions(
    citizen: Citizen = Depends(get_current_citizen),
    current_session_id: uuid.UUID = Depends(_current_session_id),
    db: Session = Depends(get_db),
) -> RevokeOthersResponse:
    """Sign out all sessions except the one used to make this request.

    Useful for "Sign out everywhere else" functionality. The current session
    (identified by the JWT ``sid`` claim) is preserved.
    """
    repo = SessionRepository(db)
    count = repo.revoke_all_except(citizen.id, current_session_id)
    db.commit()
    logger.info("Citizen %s revoked %d other session(s)", citizen.id, count)
    return RevokeOthersResponse(
        revoked_count=count,
        message=f"{count} session(s) revoked successfully.",
    )
