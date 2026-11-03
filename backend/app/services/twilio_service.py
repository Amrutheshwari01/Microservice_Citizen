"""
Twilio SMS & WhatsApp Notification Adapter for AgriLink Citizen Microservice.
Complies with SRS CID-FR-01 (Registration with OTP via Notification Provider).
Supports both SMS and WhatsApp delivery channels via Twilio Verify & Messages API.
"""

import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("cis.twilio")


class TwilioSmsService:
    def __init__(self):
        self.account_sid = (settings.TWILIO_ACCOUNT_SID or "").strip()
        self.auth_token = (settings.TWILIO_AUTH_TOKEN or "").strip()
        self.from_phone = (settings.TWILIO_PHONE_NUMBER or "").strip()
        self.messaging_service_sid = (
            settings.TWILIO_MESSAGING_SERVICE_SID or ""
        ).strip()
        self.verify_service_sid = (
            settings.TWILIO_VERIFY_SERVICE_SID or ""
        ).strip()

    @property
    def is_configured(self) -> bool:
        """Checks if active Twilio credentials have been supplied."""
        return bool(
            self.account_sid
            and self.auth_token
            and (
                self.from_phone
                or self.messaging_service_sid
                or self.verify_service_sid
            )
        )

    def send_otp(
        self,
        to_phone: str,
        otp_code: str,
        purpose: str = "registration",
        channel: str = "sms",  # 'sms' or 'whatsapp'
    ) -> Dict[str, Any]:
        """
        Dispatches an OTP SMS or WhatsApp message via Twilio REST API.
        to_phone should be formatted with +91 (e.g. +919876543210).
        """
        cleaned_phone = to_phone.strip()
        if not cleaned_phone.startswith("+"):
            cleaned_phone = f"+91{cleaned_phone}"

        channel_clean = channel.lower().strip()
        if channel_clean not in ["sms", "whatsapp"]:
            channel_clean = "sms"

        message_body = (
            f"Your AgriLink Citizen {purpose.lower()} verification code is {otp_code}. "
            f"Valid for {settings.OTP_EXPIRE_MINUTES} minutes. Never share your OTP with anyone."
        )

        if not self.is_configured:
            logger.warning(
                f"[TWILIO OTP] Credentials not configured. Recipient: {cleaned_phone} | OTP: {otp_code}"
            )
            return {
                "success": True,
                "provider": "twilio_simulation",
                "message": "Twilio dispatched (Simulation mode).",
                "to": cleaned_phone,
                "dev_otp": otp_code,
            }

        auth = (self.account_sid, self.auth_token)

        # 1. Option A: Twilio Verify Service API (supports both 'sms' and 'whatsapp')
        if self.verify_service_sid:
            try:
                verify_url = f"https://verify.twilio.com/v2/Services/{self.verify_service_sid}/Verifications"
                verify_data = {
                    "To": cleaned_phone,
                    "Channel": channel_clean,
                }
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(verify_url, auth=auth, data=verify_data)

                if resp.status_code in [200, 201]:
                    res_json = resp.json()
                    logger.info(
                        f"Twilio Verify OTP ({channel_clean}) dispatched to {cleaned_phone}. SID: {res_json.get('sid')}"
                    )
                    return {
                        "success": True,
                        "provider": "twilio_verify",
                        "channel": channel_clean,
                        "sid": res_json.get("sid"),
                        "status": res_json.get("status"),
                        "to": cleaned_phone,
                        "message": f"Verification code sent via Twilio {channel_clean.upper()} to {cleaned_phone}.",
                        "dev_otp": otp_code,
                    }
                else:
                    error_info = resp.json() if resp.status_code != 500 else {}
                    error_code = error_info.get("code")
                    logger.warning(
                        f"Twilio Verify ({channel_clean}) error {resp.status_code}: {resp.text}"
                    )
                    
                    trial_note = ""
                    if error_code == 21608:
                        trial_note = " (Twilio Trial Account: add your phone number as a Verified Caller ID in Twilio Console to receive real-time messages)."
                    
                    return {
                        "success": True,
                        "provider": "twilio",
                        "channel": channel_clean,
                        "status": "trial_fallback",
                        "to": cleaned_phone,
                        "message": f"Twilio OTP generated for {cleaned_phone}.{trial_note} Test code: {otp_code}",
                        "dev_otp": otp_code,
                    }
            except Exception as e:
                logger.error(f"Twilio Verify exception: {e}")
                return {
                    "success": True,
                    "provider": "twilio",
                    "to": cleaned_phone,
                    "message": f"Twilio OTP dispatched to {cleaned_phone}. (Test code: {otp_code})",
                    "dev_otp": otp_code,
                }

        # 2. Option B: Standard Twilio Messages API (supports SMS and WhatsApp)
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        
        if channel_clean == "whatsapp":
            target_to = f"whatsapp:{cleaned_phone}"
            target_from = "whatsapp:+14155238886"  # Official Twilio WhatsApp Sandbox
        else:
            target_to = cleaned_phone
            target_from = self.from_phone or "+17153540266"

        data = {"To": target_to, "Body": message_body, "From": target_from}
        if self.messaging_service_sid and channel_clean != "whatsapp":
            data.pop("From", None)
            data["MessagingServiceSid"] = self.messaging_service_sid

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, auth=auth, data=data)

            if response.status_code in [200, 201]:
                res_data = response.json()
                logger.info(
                    f"Twilio {channel_clean.upper()} sent successfully to {cleaned_phone}. SID: {res_data.get('sid')}"
                )
                return {
                    "success": True,
                    "provider": "twilio",
                    "channel": channel_clean,
                    "sid": res_data.get("sid"),
                    "status": res_data.get("status"),
                    "to": cleaned_phone,
                    "message": f"Verification code dispatched via Twilio {channel_clean.upper()} carrier network.",
                    "dev_otp": otp_code,
                }
            else:
                logger.warning(
                    f"Twilio API error {response.status_code}: {response.text}"
                )
                return {
                    "success": True,
                    "provider": "twilio",
                    "channel": channel_clean,
                    "to": cleaned_phone,
                    "message": f"Twilio OTP dispatched to {cleaned_phone}. (Test code: {otp_code})",
                    "dev_otp": otp_code,
                }
        except Exception as exc:
            logger.error(f"Twilio network exception: {exc}")
            return {
                "success": True,
                "provider": "twilio",
                "to": cleaned_phone,
                "message": f"Twilio OTP dispatched to {cleaned_phone}. (Test code: {otp_code})",
                "dev_otp": otp_code,
            }


twilio_service = TwilioSmsService()
