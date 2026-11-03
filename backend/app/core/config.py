from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriLink - Citizen Identity & Wallet Microservice"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = Field(
        ..., description="PostgreSQL connection string (psycopg 3)"
    )
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # Supabase (Optional direct storage credentials)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET_KYC: str = "kyc-documents"
    SUPABASE_STORAGE_BUCKET_AVATARS: str = "avatars"

    # Security & Tokens
    JWT_SECRET_KEY: str = "insecure-dev-secret-key-change-in-production-min32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    OTP_EXPIRE_MINUTES: int = 10
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15

    # Inter-Microservice Service-to-Service Secret
    INTERNAL_SERVICE_SECRET: str = "insecure-internal-secret-for-marketplace-and-rto"

    # AI & Face Recognition (Hugging Face + Local Fallback)
    HUGGINGFACE_API_KEY: str = ""
    HUGGINGFACE_MODEL: str = "google/vit-base-patch16-224"
    FACE_MATCH_THRESHOLD: float = 0.78

    # Twilio SMS Gateway (CID-FR-01 OTP Delivery)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_MESSAGING_SERVICE_SID: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
