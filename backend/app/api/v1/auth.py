import ipaddress
from typing import Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.services.auth_service import AuthService
from app.api.v1.dependencies import get_current_token_meta, get_current_citizen
from app.models.citizen import Citizen
from app.schemas.auth import (
    CitizenRegisterRequest,
    CitizenRegisterResponse,
    OtpRequestSchema,
    OtpVerifySchema,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    PasswordResetRequest,
    LogoutRequest,
    FaceLoginRequest,
    FaceEnrollRequest,
    FaceMatchResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Access"])


def _extract_valid_ip(request: Request) -> Optional[str]:
    """Safely extracts valid IPv4/IPv6 address for PostgreSQL INET columns."""
    client_host = request.client.host if request.client else None
    if not client_host:
        return None
    try:
        ipaddress.ip_address(client_host)
        return client_host
    except ValueError:
        return None


@router.post(
    "/register",
    response_model=CitizenRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Citizen",
    description="Registers a citizen, creates profile, default wallet, persona, and initial KYC tier record.",
)
def register(
    req: CitizenRegisterRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.register_citizen(req)


@router.post(
    "/otp/request",
    summary="Request an OTP challenge",
    description="Generates a 6-digit OTP for registration, login, recovery, or verification.",
)
def request_otp(
    req: OtpRequestSchema,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.request_otp(
        destination=req.destination,
        purpose=req.purpose,
        channel=getattr(req, "channel", "SMS") or "SMS"
    )


@router.post(
    "/otp/verify",
    summary="Verify an OTP code",
    description="Validates a submitted OTP code against active challenges.",
)
def verify_otp_endpoint(
    req: OtpVerifySchema,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.verify_otp(destination=req.destination, code=req.code, purpose=req.purpose)
    return {
        "success": True,
        "message": "OTP verified successfully",
    }


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate Citizen",
    description="Login using mobile, email, or citizen UUID and password. Returns JWT access & refresh tokens.",
)
def login(
    req: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    ip_addr = _extract_valid_ip(request)
    user_agent = request.headers.get("user-agent")
    service = AuthService(db)
    return service.login(req, ip_address=ip_addr, user_agent=user_agent)


@router.post(
    "/refresh",
    summary="Refresh Access Token",
    description="Exchanges a valid refresh token for a newly signed access token.",
)
def refresh(
    req: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.refresh_access_token(req.refresh_token)


@router.post(
    "/logout",
    summary="Logout Citizen",
    description="Revokes current JWT access token JTI and closes the active refresh token session.",
)
def logout(
    req: LogoutRequest,
    meta=Depends(get_current_token_meta),
    db: Session = Depends(get_db),
):
    citizen, jti, exp = meta
    service = AuthService(db)
    service.logout(
        citizen_id=citizen.id,
        token_jti=jti,
        token_exp=exp,
        refresh_token=req.refresh_token,
    )
    return {
        "success": True,
        "message": "Logged out successfully. Token has been revoked.",
    }


@router.post(
    "/password/reset",
    summary="Reset Password",
    description="Resets citizen password upon presenting a valid recovery OTP.",
)
def reset_password(
    req: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.reset_password(
        identifier=req.identifier,
        otp_code=req.otp_code,
        new_password=req.new_password,
    )
    return {
        "success": True,
        "message": "Password reset successfully. You may now log in with your new password.",
    }


@router.post(
    "/login-face",
    response_model=FaceMatchResponse,
    summary="Biometric Face Recognition Login",
    description="Authenticates citizen by matching webcam facial embedding against enrolled biometrics.",
)
def login_with_face_endpoint(
    req: FaceLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    ip_addr = _extract_valid_ip(request)
    user_agent = request.headers.get("User-Agent")
    service = AuthService(db)
    return service.login_with_face(
        face_image=req.face_image,
        identifier=req.identifier,
        device_label=req.device_label,
        ip_address=ip_addr,
        user_agent=user_agent,
    )


@router.post(
    "/enroll-face",
    summary="Enroll or Update Face Biometrics",
    description="Registers or updates the authenticated citizen's face descriptor vector.",
)
def enroll_face_endpoint(
    req: FaceEnrollRequest,
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.enroll_face(citizen_id=citizen.id, face_image=req.face_image)


@router.get(
    "/face-status",
    summary="Check Face Recognition Enrollment Status",
    description="Returns whether the authenticated citizen has enrolled face biometrics.",
)
def check_face_status(
    citizen: Citizen = Depends(get_current_citizen),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    bio = service.repo.get_biometric(citizen.id, "FACE")
    return {
        "success": True,
        "enrolled": bio is not None and bio.embedding is not None,
        "model_name": bio.model_name if bio else None,
        "updated_at": bio.updated_at.isoformat() if bio else None,
    }
