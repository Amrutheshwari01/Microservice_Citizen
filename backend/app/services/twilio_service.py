"""
Twilio SMS Notification Adapter for AgriLink Citizen Microservice.
Complies with SRS CID-FR-01 (Registration with OTP via Notification Provider).
"""

import logging
from typing import Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger("cis.twilio")


class TwilioSmsService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID.strip()
        self.auth_token = settings.TWILIO_AUTH_TOKEN.strip()
        self.from_phone = settings.TWILIO_PHONE_NUMBER.strip()
        self.messaging_service_sid = settings.TWILIO_MESSAGING_SERVICE_SID.strip()

    @property
    def is_configured(self) -> bool:
        """Checks if active Twilio credentials have been supplied."""
        return bool(
            self.account_sid
            and self.auth_token
            and (self.from_phone or self.messaging_service_sid)
        )

    def send_otp(
        self, to_phone: str, otp_code: str, purpose: str = "registration"
    ) -> Dict[str, Any]:
        """
        Dispatches an OTP SMS to the recipient phone number via Twilio REST API.
        to_phone should be E.164 formatted (e.g. +919876543210).
        """
        # Ensure E.164 prefix (+91 for 10-digit Indian numbers)
        cleaned_phone = to_phone.strip()
        if not cleaned_phone.startswith("+"):
            cleaned_phone = f"+91{cleaned_phone}"

        message_body = (
            f"Your AgriLink Citizen {purpose.lower()} verification code is {otp_code}. "
            f"Valid for {settings.OTP_EXPIRE_MINUTES} minutes. Never share your OTP with anyone."
        )

        if not self.is_configured:
            logger.warning(
                f"[TWILIO OTP] Credentials not set in .env. "
                f"Recipient: {cleaned_phone} | OTP: {otp_code} | "
                f"Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to send live SMS."
            )
            return {
                "success": True,
                "provider": "twilio_simulation",
                "message": "Twilio SMS dispatched (Simulation). Set TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN for live carrier delivery.",
                "to": cleaned_phone,
                "dev_otp": otp_code,
            }

        # Dispatch via live Twilio API
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        auth = (self.account_sid, self.auth_token)

        data = {
            "To": cleaned_phone,
            "Body": message_body,
        }

        if self.messaging_service_sid:
            data["MessagingServiceSid"] = self.messaging_service_sid
        else:
            data["From"] = self.from_phone

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, auth=auth, data=data)

            if response.status_code in [200, 201]:
                res_data = response.json()
                logger.info(
                    f"Twilio SMS sent successfully to {cleaned_phone}. SID: {res_data.get('sid')}"
                )
                return {
                    "success": True,
                    "provider": "twilio",
                    "sid": res_data.get("sid"),
                    "status": res_data.get("status"),
                    "to": cleaned_phone,
                    "message": "Verification code dispatched via Twilio SMS carrier network.",
                }
            else:
                logger.error(
                    f"Twilio API error {response.status_code}: {response.text}"
                )
                return {
                    "success": False,
                    "provider": "twilio",
                    "error": response.text,
                    "message": f"Twilio SMS error: {response.status_code}. Using fallback OTP.",
                    "dev_otp": otp_code,
                }
        except Exception as exc:
            logger.error(f"Twilio network exception: {exc}")
            return {
                "success": False,
                "provider": "twilio",
                "error": str(exc),
                "message": f"Twilio dispatch failed: {str(exc)}",
                "dev_otp": otp_code,
            }


twilio_service = TwilioSmsService()
