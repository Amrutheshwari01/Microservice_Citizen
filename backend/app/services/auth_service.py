import uuid
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_otp,
    verify_otp,
)
from app.core.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ConflictException,
    NotFoundException,
    ForbiddenException,
)
from app.repositories.citizen_repo import CitizenRepository
from app.models.persona import Persona
from app.models.wallet import Wallet
from app.models.kyc import KycRecord
from app.models.citizen import Citizen, Consent
from app.services.face_service import face_recognition_service
from app.services.twilio_service import twilio_service
from app.schemas.auth import (
    FaceMatchResponse,
    CitizenRegisterRequest,
    CitizenRegisterResponse,
    LoginRequest,
    TokenResponse,
)

logger = logging.getLogger("cis.auth_service")


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CitizenRepository(db)

    def register_citizen(self, req: CitizenRegisterRequest) -> CitizenRegisterResponse:
        """
        Registers a new citizen with full atomicity:
        - Creates Citizen identity
        - Creates CitizenProfile
        - Creates Credential
        - Creates default CUSTOMER persona
        - Creates initial ACTIVE INR Wallet with 0.0000 balance
        - Creates T0 KYC record
        """
        # Check uniqueness
        if req.email and self.repo.get_by_email(req.email):
            raise ConflictException(f"Citizen with email {req.email} already exists")

        if req.mobile and self.repo.get_by_mobile(req.mobile):
            raise ConflictException(f"Citizen with mobile {req.mobile} already exists")

        # Handle password
        if req.password:
            hashed_pwd = hash_password(req.password)
        else:
            # Generate random unusable hash for OTP-registered user until password is set
            random_key = uuid.uuid4().hex + uuid.uuid4().hex
            hashed_pwd = hash_password(random_key)

        try:
            # 1. Citizen
            citizen = self.repo.create_citizen(
                full_name=req.full_name,
                email=req.email,
                mobile=req.mobile,
                status="ACTIVE",
            )

            # 2. Profile (saves captured registration photo)
            self.repo.create_profile(
                citizen_id=citizen.id,
                preferred_language=req.preferred_language,
                nationality_code=req.nationality_code,
                profile_photo_ref=getattr(req, "face_image", None),
            )

            # 3. Credentials
            self.repo.create_credentials(
                citizen_id=citizen.id,
                password_hash=hashed_pwd,
            )

            # 4. Default Persona (CUSTOMER)
            customer_persona = Persona(
                id=uuid.uuid4(),
                citizen_id=citizen.id,
                persona_type="CUSTOMER",
                status="ACTIVE",
                is_default=True,
                display_name="Customer",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.db.add(customer_persona)

            # 5. Default Wallet
            wallet = Wallet(
                id=uuid.uuid4(),
                citizen_id=citizen.id,
                currency_code="INR",
                status="ACTIVE",
                available_balance=Decimal("0.0000"),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.db.add(wallet)

            # 6. Default KYC tier record (T0)
            kyc = KycRecord(
                id=uuid.uuid4(),
                citizen_id=citizen.id,
                kyc_tier="T0",
                status="PENDING",
                submitted_at=datetime.utcnow(),
            )
            self.db.add(kyc)

            # 7. Default Consents (Terms & Privacy)
            terms_consent = Consent(
                id=uuid.uuid4(),
                citizen_id=citizen.id,
                consent_type="TERMS_OF_SERVICE",
                purpose="Acceptance of AgriLink Platform Terms of Service and Conditions",
                policy_version="1.0",
                granted=True,
                captured_at=datetime.utcnow(),
            )
            privacy_consent = Consent(
                id=uuid.uuid4(),
                citizen_id=citizen.id,
                consent_type="DATA_PRIVACY",
                purpose="Consent for processing personal identity and contact data",
                policy_version="1.0",
                granted=True,
                captured_at=datetime.utcnow(),
            )
            self.db.add(terms_consent)
            self.db.add(privacy_consent)

            # 8. Face Biometrics Enrollment if provided
            if getattr(req, "face_image", None):
                try:
                    embedding, provider_name = (
                        face_recognition_service.extract_embedding(req.face_image)
                    )
                    self.repo.save_biometric(
                        citizen_id=citizen.id,
                        embedding=embedding,
                        photo_url=req.face_image,
                        model_name=provider_name,
                        biometric_type="FACE",
                    )
                    logger.info(
                        f"Auto-enrolled face biometrics on registration for citizen {citizen.id}"
                    )
                except Exception as exc:
                    logger.warning(
                        f"Face enrollment during registration skipped due to error: {exc}"
                    )

            self.db.commit()
            self.db.refresh(citizen)
            self.db.refresh(wallet)

            logger.info(
                f"Citizen registered successfully: ID={citizen.id}, wallet={wallet.id}"
            )

            return CitizenRegisterResponse(
                success=True,
                message="Citizen registered successfully with default wallet and persona.",
                citizen_id=citizen.id,
                full_name=citizen.full_name,
                email=citizen.email_normalized,
                mobile=citizen.mobile_e164,
                status=citizen.status,
                wallet_id=wallet.id,
                created_at=citizen.created_at.isoformat(),
            )
        except Exception as exc:
            self.db.rollback()
            logger.error(f"Failed to register citizen: {exc}", exc_info=True)
            raise

    def request_otp(self, destination: str, purpose: str) -> Dict[str, Any]:
        """Generates OTP, persists hashed challenge, and prepares delivery."""
        otp_code = generate_otp(6)
        salt = destination.strip().lower()
        code_hash = hash_otp(otp_code, salt)
        expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

        citizen = self.repo.get_by_identifier(destination)
        citizen_id = citizen.id if citizen else None

        self.repo.create_otp_challenge(
            destination_masked=salt,
            code_hash=code_hash,
            purpose=purpose,
            expires_at=expires_at,
            citizen_id=citizen_id,
        )
        self.db.commit()

        # Dispatch OTP via Twilio SMS adapter
        logger.info(f"OTP generated for {salt} [{purpose}]: {otp_code}")
        twilio_res = twilio_service.send_otp(
            to_phone=destination, otp_code=otp_code, purpose=purpose
        )

        res = {
            "success": True,
            "message": twilio_res.get(
                "message", f"OTP successfully dispatched to {destination}"
            ),
            "provider": twilio_res.get("provider", "twilio"),
            "expires_in_minutes": settings.OTP_EXPIRE_MINUTES,
        }
        if "dev_otp" in twilio_res:
            res["dev_otp"] = twilio_res["dev_otp"]
        return res

    def verify_otp(self, destination: str, code: str, purpose: str) -> bool:
        """Verifies OTP code against hashed challenge."""
        salt = destination.strip().lower()
        challenge = self.repo.get_active_otp(salt, purpose)
        if not challenge:
            raise BadRequestException(
                "Invalid, expired, or already used OTP. Please request a new code."
            )

        if not verify_otp(code, challenge.code_hash, salt):
            self.repo.increment_otp_attempt(challenge.id)
            self.db.commit()
            raise BadRequestException(
                "Incorrect OTP. Please check the code and try again."
            )

        self.repo.consume_otp(challenge.id)
        self.db.commit()
        return True

    def login(
        self,
        req: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """
        Authenticates citizen, enforces account locking, creates sessions,
        and generates signed JWT tokens.
        """
        citizen = self.repo.get_by_identifier(req.identifier)
        if not citizen:
            raise UnauthorizedException(
                "Invalid credentials. Please verify your mobile/email and password."
            )

        if citizen.status != "ACTIVE":
            raise ForbiddenException(
                f"Account is {citizen.status.lower()}. Please contact support."
            )

        cred = self.repo.get_credentials(citizen.id)
        if not cred:
            raise UnauthorizedException("No credentials configured for this account.")

        # Check account lockout
        if cred.locked_until and cred.locked_until > datetime.utcnow():
            remaining_mins = (
                int((cred.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
            )
            raise ForbiddenException(
                f"Account temporarily locked due to multiple failed login attempts. Try again in {remaining_mins} minutes."
            )

        # Verify password
        if not verify_password(req.password, cred.password_hash):
            failed_count = self.repo.record_failed_login(
                citizen.id,
                max_attempts=settings.MAX_LOGIN_ATTEMPTS,
                lockout_minutes=settings.LOCKOUT_DURATION_MINUTES,
            )
            self.db.commit()
            attempts_left = max(0, settings.MAX_LOGIN_ATTEMPTS - failed_count)
            raise UnauthorizedException(
                f"Invalid credentials. {attempts_left} attempt(s) remaining before account lockout."
            )

        # Login successful - reset failed attempts
        self.repo.reset_failed_logins(citizen.id)

        # Determine active persona
        active_persona = "CUSTOMER"
        for p in citizen.personas:
            if p.is_default and p.status == "ACTIVE":
                active_persona = p.persona_type
                break

        # Generate tokens
        claims = {
            "full_name": citizen.full_name,
            "status": citizen.status,
            "persona": active_persona,
        }
        access_token, access_jti, access_exp = create_access_token(
            str(citizen.id), claims=claims
        )
        refresh_token, refresh_jti, refresh_exp = create_refresh_token(str(citizen.id))

        # Store session
        refresh_hash = hash_otp(refresh_token, str(citizen.id))
        self.repo.create_session(
            citizen_id=citizen.id,
            refresh_token_hash=refresh_hash,
            expires_at=refresh_exp,
            device_label=req.device_label,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.commit()

        expires_in = int((access_exp - datetime.now(timezone.utc)).total_seconds())

        return TokenResponse(
            success=True,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
            expires_in=expires_in,
            citizen_id=citizen.id,
            full_name=citizen.full_name,
            active_persona=active_persona,
            status=citizen.status,
        )

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Issues a fresh access token from an active, unrevoked refresh token."""
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type")
            citizen_id_str = payload.get("sub")
            citizen_id = uuid.UUID(citizen_id_str)
        except Exception:
            raise UnauthorizedException("Invalid or expired refresh token")

        citizen = self.repo.get_by_id(citizen_id)
        if not citizen or citizen.status != "ACTIVE":
            raise UnauthorizedException("Account inactive or not found")

        # Check session validity
        refresh_hash = hash_otp(refresh_token, str(citizen.id))
        session = self.repo.get_active_session_by_hash(citizen.id, refresh_hash)
        if not session:
            raise UnauthorizedException(
                "Session has been revoked or expired. Please log in again."
            )

        # Determine active persona
        active_persona = "CUSTOMER"
        for p in citizen.personas:
            if p.is_default and p.status == "ACTIVE":
                active_persona = p.persona_type
                break

        claims = {
            "full_name": citizen.full_name,
            "status": citizen.status,
            "persona": active_persona,
        }
        new_access_token, jti, exp = create_access_token(str(citizen.id), claims=claims)
        expires_in = int((exp - datetime.now(timezone.utc)).total_seconds())

        return {
            "success": True,
            "access_token": new_access_token,
            "token_type": "Bearer",
            "expires_in": expires_in,
        }

    def logout(
        self,
        citizen_id: uuid.UUID,
        token_jti: str,
        token_exp: datetime,
        refresh_token: Optional[str] = None,
    ) -> None:
        """Revokes the current access token and session."""
        self.repo.add_token_revocation(
            citizen_id=citizen_id,
            token_jti=token_jti,
            expires_at=token_exp,
            reason_code="USER_LOGOUT",
        )
        if refresh_token:
            refresh_hash = hash_otp(refresh_token, str(citizen_id))
            session = self.repo.get_active_session_by_hash(citizen_id, refresh_hash)
            if session:
                self.repo.revoke_session(session.id)
        self.db.commit()

    def reset_password(self, identifier: str, otp_code: str, new_password: str) -> bool:
        """Resets password after verifying OTP."""
        self.verify_otp(identifier, otp_code, "RECOVERY")
        citizen = self.repo.get_by_identifier(identifier)
        if not citizen:
            raise NotFoundException("Citizen account not found")

        new_hash = hash_password(new_password)
        self.repo.update_password(citizen.id, new_hash)
        # Invalidate all existing sessions for security
        self.repo.revoke_all_sessions(citizen.id)
        self.db.commit()
        return True

    def enroll_face(self, citizen_id: uuid.UUID, face_image: str) -> Dict[str, Any]:
        """
        Enrolls or updates facial biometrics for an active citizen.
        Extracts embedding via Hugging Face or resilient local feature extractor.
        """
        citizen = self.repo.get_by_id(citizen_id)
        if not citizen:
            raise NotFoundException("Citizen not found")

        try:
            embedding, provider_name = face_recognition_service.extract_embedding(
                face_image
            )
        except Exception as exc:
            raise BadRequestException(f"Failed to process face image: {exc}")

        bio = self.repo.save_biometric(
            citizen_id=citizen.id,
            embedding=embedding,
            model_name=provider_name,
            biometric_type="FACE",
        )
        self.db.commit()

        logger.info(
            f"Enrolled face biometrics for citizen {citizen.id} using {provider_name}"
        )
        return {
            "success": True,
            "message": "Face recognition biometrics enrolled successfully.",
            "provider": provider_name,
            "enrolled_at": bio.updated_at.isoformat(),
        }

    def login_with_face(
        self,
        face_image: str,
        identifier: Optional[str] = None,
        device_label: Optional[str] = "web",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> FaceMatchResponse:
        """
        Biometric Face Recognition Login:
        1. Extracts embedding from candidate face image via Hugging Face / Local pipeline.
        2. Matches against enrolled face biometrics (1:1 if identifier provided, 1:N otherwise).
        3. If similarity >= threshold, generates access/refresh JWT tokens,
           creates session, and logs audit trail.
        """
        try:
            candidate_emb, provider_name = face_recognition_service.extract_embedding(
                face_image
            )
        except Exception as exc:
            raise BadRequestException(f"Unable to process facial image: {exc}")

        matched_citizen: Optional[Citizen] = None
        best_confidence: float = 0.0

        if identifier:
            # 1:1 Targeted Verification
            citizen = self.repo.get_by_identifier(identifier)
            if not citizen:
                raise UnauthorizedException(
                    "No account found matching the provided identifier."
                )
            if citizen.status != "ACTIVE":
                raise ForbiddenException(f"Account is {citizen.status.lower()}.")

            bio = self.repo.get_biometric(citizen.id, "FACE")
            if not bio or not bio.embedding:
                raise BadRequestException(
                    "Face recognition login is not enrolled for this account. Please log in with password or OTP and enroll in settings."
                )

            is_match, conf = face_recognition_service.verify_match(
                candidate_emb, bio.embedding
            )
            if not is_match:
                raise UnauthorizedException(
                    f"Face recognition failed: biometric match confidence ({conf}%) is below the security threshold."
                )
            matched_citizen = citizen
            best_confidence = conf
        else:
            # 1:N Biometric Identification across active citizens
            records = self.repo.get_all_face_biometrics()
            if not records:
                raise UnauthorizedException(
                    "No enrolled face biometrics found. Please enroll your face during registration or via settings."
                )

            best_match_record = None
            for bio, citizen in records:
                if not bio.embedding:
                    continue
                is_match, conf = face_recognition_service.verify_match(
                    candidate_emb, bio.embedding
                )
                if is_match and conf > best_confidence:
                    best_confidence = conf
                    best_match_record = (bio, citizen)

            if not best_match_record:
                raise UnauthorizedException(
                    "Face not recognized. Please ensure good lighting and face camera directly, or log in with your credentials."
                )

            matched_citizen = best_match_record[1]

        # Reset failed password logins if any
        self.repo.reset_failed_logins(matched_citizen.id)

        # Determine active persona and kyc tier
        active_persona = "CUSTOMER"
        for p in matched_citizen.personas:
            if p.is_default and p.status == "ACTIVE":
                active_persona = p.persona_type
                break

        kyc_tier = "T0"
        for k in matched_citizen.kyc_records:
            kyc_tier = k.kyc_tier
            break

        # Generate signed JWT tokens
        claims = {
            "full_name": matched_citizen.full_name,
            "status": matched_citizen.status,
            "persona": active_persona,
            "kyc_tier": kyc_tier,
            "auth_method": "BIOMETRIC_FACE",
        }
        access_token, access_jti, access_exp = create_access_token(
            str(matched_citizen.id), claims=claims
        )
        refresh_token, refresh_jti, refresh_exp = create_refresh_token(
            str(matched_citizen.id)
        )

        # Store session
        refresh_hash = hash_otp(refresh_token, str(matched_citizen.id))
        self.repo.create_session(
            citizen_id=matched_citizen.id,
            refresh_token_hash=refresh_hash,
            expires_at=refresh_exp,
            device_label=f"{device_label or 'web'} (Face Login)",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.commit()

        expires_in = int((access_exp - datetime.now(timezone.utc)).total_seconds())

        return FaceMatchResponse(
            success=True,
            message=f"Biometric face login verified successfully ({best_confidence}% match).",
            match_confidence=best_confidence,
            provider=provider_name,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            citizen_id=matched_citizen.id,
            full_name=matched_citizen.full_name,
            active_persona=active_persona,
            kyc_tier=kyc_tier,
        )
