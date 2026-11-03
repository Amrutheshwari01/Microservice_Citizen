import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Password hashing using Argon2 with fallback to bcrypt
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2/bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str,
    claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> tuple[str, str, datetime]:
    """
    Create a signed JWT access token.
    Returns (token_string, jti, expire_datetime).
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    jti = str(uuid.uuid4())
    payload = {
        "sub": subject,
        "jti": jti,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if claims:
        payload.update(claims)

    encoded_jwt = jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt, jti, expire


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
) -> tuple[str, str, datetime]:
    """
    Create a signed JWT refresh token.
    Returns (token_string, jti, expire_datetime).
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    jti = str(uuid.uuid4())
    payload = {
        "sub": subject,
        "jti": jti,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    encoded_jwt = jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt, jti, expire


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "sub", "jti"]},
    )


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    digits = "0123456789"
    return "".join(secrets.choice(digits) for _ in range(length))


def hash_otp(otp: str, salt: str = "") -> str:
    """Hash an OTP code using SHA-256 so plaintext is never persisted."""
    key = f"{salt}:{otp}:{settings.JWT_SECRET_KEY}".encode("utf-8")
    return hashlib.sha256(key).hexdigest()


def verify_otp(plain_otp: str, hashed_otp: str, salt: str = "") -> bool:
    """Verify OTP against its SHA-256 hash securely using hmac.compare_digest."""
    expected_hash = hash_otp(plain_otp, salt)
    return hmac.compare_digest(expected_hash, hashed_otp)


def verify_internal_service_key(provided_key: str) -> bool:
    """Verify internal service-to-service secret token."""
    return hmac.compare_digest(provided_key, settings.INTERNAL_SERVICE_SECRET)
