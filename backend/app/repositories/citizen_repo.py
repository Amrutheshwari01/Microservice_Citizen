import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import select, update, and_
from sqlalchemy.orm import Session

from app.models.citizen import (
    Citizen,
    CitizenProfile,
    Credential,
    OtpChallenge,
    CitizenSession,
    TokenRevocation,
)
from app.models.biometric import CitizenBiometric


class CitizenRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, citizen_id: uuid.UUID) -> Optional[Citizen]:
        stmt = select(Citizen).where(Citizen.id == citizen_id)
        return self.db.scalars(stmt).first()

    def get_by_email(self, email: str) -> Optional[Citizen]:
        stmt = select(Citizen).where(Citizen.email_normalized == email.strip().lower())
        return self.db.scalars(stmt).first()

    def get_by_mobile(self, mobile: str) -> Optional[Citizen]:
        stmt = select(Citizen).where(Citizen.mobile_e164 == mobile.strip())
        return self.db.scalars(stmt).first()

    def get_by_identifier(self, identifier: str) -> Optional[Citizen]:
        cleaned = identifier.strip()
        # Check if UUID
        try:
            val_uuid = uuid.UUID(cleaned)
            c = self.get_by_id(val_uuid)
            if c:
                return c
        except ValueError:
            pass

        # Check if email
        if "@" in cleaned:
            return self.get_by_email(cleaned)

        # Otherwise check mobile
        return self.get_by_mobile(cleaned)

    def create_citizen(
        self,
        full_name: str,
        email: Optional[str] = None,
        mobile: Optional[str] = None,
        status: str = "ACTIVE",
    ) -> Citizen:
        citizen = Citizen(
            id=uuid.uuid4(),
            full_name=full_name.strip(),
            email_normalized=email.strip().lower() if email else None,
            mobile_e164=mobile.strip() if mobile else None,
            status=status,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(citizen)
        self.db.flush()
        return citizen

    def create_profile(
        self,
        citizen_id: uuid.UUID,
        preferred_language: str = "en",
        nationality_code: str = "IN",
    ) -> CitizenProfile:
        profile = CitizenProfile(
            citizen_id=citizen_id,
            preferred_language=preferred_language,
            nationality_code=nationality_code,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(profile)
        self.db.flush()
        return profile

    def create_credentials(
        self, citizen_id: uuid.UUID, password_hash: str
    ) -> Credential:
        cred = Credential(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            password_hash=password_hash,
            password_changed_at=datetime.utcnow(),
            failed_login_count=0,
            created_at=datetime.utcnow(),
        )
        self.db.add(cred)
        self.db.flush()
        return cred

    def get_credentials(self, citizen_id: uuid.UUID) -> Optional[Credential]:
        stmt = select(Credential).where(Credential.citizen_id == citizen_id)
        return self.db.scalars(stmt).first()

    def record_failed_login(
        self,
        citizen_id: uuid.UUID,
        max_attempts: int = 5,
        lockout_minutes: int = 15,
    ) -> int:
        cred = self.get_credentials(citizen_id)
        if not cred:
            return 0
        cred.failed_login_count += 1
        if cred.failed_login_count >= max_attempts:
            cred.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
        self.db.flush()
        return cred.failed_login_count

    def reset_failed_logins(self, citizen_id: uuid.UUID) -> None:
        cred = self.get_credentials(citizen_id)
        if cred:
            cred.failed_login_count = 0
            cred.locked_until = None
            self.db.flush()

    def update_password(self, citizen_id: uuid.UUID, new_password_hash: str) -> None:
        cred = self.get_credentials(citizen_id)
        if cred:
            cred.password_hash = new_password_hash
            cred.password_changed_at = datetime.utcnow()
            cred.failed_login_count = 0
            cred.locked_until = None
            self.db.flush()

    def create_otp_challenge(
        self,
        destination_masked: str,
        code_hash: str,
        purpose: str,
        expires_at: datetime,
        citizen_id: Optional[uuid.UUID] = None,
    ) -> OtpChallenge:
        challenge = OtpChallenge(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            purpose=purpose,
            destination_masked=destination_masked,
            code_hash=code_hash,
            expires_at=expires_at,
            attempt_count=0,
            created_at=datetime.utcnow(),
        )
        self.db.add(challenge)
        self.db.flush()
        return challenge

    def get_active_otp(
        self, destination_masked: str, purpose: str
    ) -> Optional[OtpChallenge]:
        now = datetime.utcnow()
        stmt = (
            select(OtpChallenge)
            .where(
                and_(
                    OtpChallenge.destination_masked == destination_masked,
                    OtpChallenge.purpose == purpose,
                    OtpChallenge.consumed_at.is_(None),
                    OtpChallenge.expires_at > now,
                    OtpChallenge.attempt_count < 5,
                )
            )
            .order_by(OtpChallenge.created_at.desc())
        )
        return self.db.scalars(stmt).first()

    def consume_otp(self, challenge_id: uuid.UUID) -> None:
        stmt = (
            update(OtpChallenge)
            .where(OtpChallenge.id == challenge_id)
            .values(consumed_at=datetime.utcnow())
        )
        self.db.execute(stmt)
        self.db.flush()

    def increment_otp_attempt(self, challenge_id: uuid.UUID) -> None:
        stmt = (
            update(OtpChallenge)
            .where(OtpChallenge.id == challenge_id)
            .values(attempt_count=OtpChallenge.attempt_count + 1)
        )
        self.db.execute(stmt)
        self.db.flush()

    def create_session(
        self,
        citizen_id: uuid.UUID,
        refresh_token_hash: str,
        expires_at: datetime,
        device_label: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> CitizenSession:
        sess = CitizenSession(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            refresh_token_hash=refresh_token_hash,
            device_label=device_label,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.utcnow(),
            expires_at=expires_at,
        )
        self.db.add(sess)
        self.db.flush()
        return sess

    def get_active_session_by_hash(
        self, citizen_id: uuid.UUID, token_hash: str
    ) -> Optional[CitizenSession]:
        now = datetime.utcnow()
        stmt = select(CitizenSession).where(
            and_(
                CitizenSession.citizen_id == citizen_id,
                CitizenSession.refresh_token_hash == token_hash,
                CitizenSession.revoked_at.is_(None),
                CitizenSession.expires_at > now,
            )
        )
        return self.db.scalars(stmt).first()

    def revoke_session(self, session_id: uuid.UUID) -> None:
        stmt = (
            update(CitizenSession)
            .where(CitizenSession.id == session_id)
            .values(revoked_at=datetime.utcnow())
        )
        self.db.execute(stmt)
        self.db.flush()

    def revoke_all_sessions(self, citizen_id: uuid.UUID) -> None:
        stmt = (
            update(CitizenSession)
            .where(
                and_(
                    CitizenSession.citizen_id == citizen_id,
                    CitizenSession.revoked_at.is_(None),
                )
            )
            .values(revoked_at=datetime.utcnow())
        )
        self.db.execute(stmt)
        self.db.flush()

    def add_token_revocation(
        self,
        citizen_id: uuid.UUID,
        token_jti: str,
        expires_at: datetime,
        reason_code: Optional[str] = "LOGOUT",
    ) -> TokenRevocation:
        rev = TokenRevocation(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            token_jti=token_jti,
            expires_at=expires_at,
            revoked_at=datetime.utcnow(),
            reason_code=reason_code,
        )
        self.db.add(rev)
        self.db.flush()
        return rev

    def is_token_revoked(self, token_jti: str) -> bool:
        stmt = select(TokenRevocation).where(TokenRevocation.token_jti == token_jti)
        return self.db.scalars(stmt).first() is not None

    def save_biometric(
        self,
        citizen_id: uuid.UUID,
        embedding: List[float],
        photo_url: Optional[str] = None,
        model_name: str = "facenet512",
        biometric_type: str = "FACE",
    ) -> CitizenBiometric:
        stmt = select(CitizenBiometric).where(
            and_(
                CitizenBiometric.citizen_id == citizen_id,
                CitizenBiometric.biometric_type == biometric_type,
            )
        )
        existing = self.db.scalars(stmt).first()
        if existing:
            existing.embedding = embedding
            existing.photo_url = photo_url
            existing.model_name = model_name
            existing.updated_at = datetime.utcnow()
            self.db.flush()
            return existing

        bio = CitizenBiometric(
            id=uuid.uuid4(),
            citizen_id=citizen_id,
            biometric_type=biometric_type,
            embedding=embedding,
            photo_url=photo_url,
            model_name=model_name,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(bio)
        self.db.flush()
        return bio

    def get_biometric(
        self, citizen_id: uuid.UUID, biometric_type: str = "FACE"
    ) -> Optional[CitizenBiometric]:
        stmt = select(CitizenBiometric).where(
            and_(
                CitizenBiometric.citizen_id == citizen_id,
                CitizenBiometric.biometric_type == biometric_type,
            )
        )
        return self.db.scalars(stmt).first()

    def get_all_face_biometrics(self):
        stmt = (
            select(CitizenBiometric, Citizen)
            .join(Citizen, Citizen.id == CitizenBiometric.citizen_id)
            .where(
                and_(
                    CitizenBiometric.biometric_type == "FACE",
                    Citizen.status == "ACTIVE",
                )
            )
        )
        return list(self.db.execute(stmt).all())
