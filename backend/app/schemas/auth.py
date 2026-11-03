import re
import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class CitizenRegisterRequest(BaseModel):
    full_name: str = Field(
        ..., min_length=2, max_length=150, description="Full legal name of the citizen"
    )
    email: EmailStr = Field(..., description="Citizen email address (mandatory)")
    mobile: str = Field(
        ..., description="Mobile number in E.164 format (e.g., +919876543210)"
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)",
    )
    confirm_password: str = Field(..., description="Password confirmation (mandatory)")
    preferred_language: str = Field(
        "en", max_length=20, description="Language preference (en, hi, kn)"
    )
    nationality_code: str = Field(
        ...,
        min_length=2,
        max_length=2,
        description="2-letter country code (mandatory, e.g. IN)",
    )
    face_image: Optional[str] = Field(
        None,
        description="Optional Base64 Data URL of face selfie for biometric enrollment",
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError(
                "Password must contain at least one uppercase letter (A-Z)"
            )
        if not re.search(r"[a-z]", v):
            raise ValueError(
                "Password must contain at least one lowercase letter (a-z)"
            )
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit (0-9)")
        if not re.search(r"[@$!%*?&#^_\-]", v):
            raise ValueError(
                "Password must contain at least one special character (@$!%*?&#^_-)"
            )
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        if v is None:
            return None
        cleaned = re.sub(r"[\s\-]", "", v)
        if not re.match(r"^\+?[1-9]\d{9,14}$", cleaned):
            raise ValueError(
                "Mobile must be a valid E.164 phone number, e.g. +919876543210"
            )
        if not cleaned.startswith("+"):
            cleaned = "+91" + cleaned if len(cleaned) == 10 else "+" + cleaned
        return cleaned

    @model_validator(mode="after")
    def validate_inputs(self):
        if not self.email:
            raise ValueError("Email address is mandatory for citizen registration")
        if not self.nationality_code or len(self.nationality_code.strip()) != 2:
            raise ValueError("Nationality code is mandatory (e.g. 'IN')")
        if self.password != self.confirm_password:
            raise ValueError("Password and confirm_password do not match")
        return self


class CitizenRegisterResponse(BaseModel):
    success: bool = True
    message: str
    citizen_id: uuid.UUID
    full_name: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    status: str
    wallet_id: uuid.UUID
    created_at: str


class OtpRequestSchema(BaseModel):
    destination: str = Field(
        ..., description="Mobile number (+919876543210) or email address"
    )
    purpose: str = Field(
        "LOGIN", description="Purpose: REGISTER, LOGIN, RECOVERY, CONTACT_VERIFY"
    )
    channel: str = Field("SMS", description="Delivery channel: SMS or WHATSAPP")

    @field_validator("purpose")
    @classmethod
    def validate_purpose(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in ["REGISTER", "LOGIN", "RECOVERY", "CONTACT_VERIFY"]:
            raise ValueError(
                "Purpose must be REGISTER, LOGIN, RECOVERY, or CONTACT_VERIFY"
            )
        return v_upper


class OtpVerifySchema(BaseModel):
    destination: str = Field(
        ..., description="Mobile number or email address that received the OTP"
    )
    code: str = Field(..., min_length=4, max_length=8, description="Numeric OTP code")
    purpose: str = Field(
        "LOGIN", description="Purpose: REGISTER, LOGIN, RECOVERY, CONTACT_VERIFY"
    )


class LoginRequest(BaseModel):
    identifier: str = Field(
        ..., description="Citizen ID (UUID), Email address, or Mobile number (+91...)"
    )
    password: str = Field(..., min_length=1, description="Password")
    device_label: Optional[str] = Field(
        "web", max_length=120, description="Device name / browser"
    )


class TokenResponse(BaseModel):
    success: bool = True
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    citizen_id: uuid.UUID
    full_name: str
    active_persona: str
    status: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid refresh token")


class PasswordResetRequest(BaseModel):
    identifier: str = Field(..., description="Mobile or Email")
    otp_code: str = Field(..., min_length=4, max_length=8)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @model_validator(mode="after")
    def match_passwords(self):
        if self.new_password != self.confirm_password:
            raise ValueError("new_password and confirm_password do not match")
        return self


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class FaceLoginRequest(BaseModel):
    face_image: str = Field(
        ..., description="Base64 Data URL of face selfie captured from camera"
    )
    identifier: Optional[str] = Field(
        None, description="Optional email or mobile number to narrow search"
    )
    device_label: Optional[str] = Field(
        "web", max_length=120, description="Device name / browser"
    )


class FaceEnrollRequest(BaseModel):
    face_image: str = Field(
        ..., description="Base64 Data URL of face selfie to enroll or update"
    )


class FaceMatchResponse(BaseModel):
    success: bool = True
    message: str
    match_confidence: float
    provider: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int = 3600
    citizen_id: Optional[uuid.UUID] = None
    full_name: Optional[str] = None
    active_persona: Optional[str] = None
    kyc_tier: Optional[str] = None
