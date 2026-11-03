"""Integration tests for Consents, Sessions, Admin, KYC uploads, and Avatar.

Runs against the live Supabase PostgreSQL database.
"""

import uuid
import secrets
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings

client = TestClient(app)
INTERNAL_HEADER = {"X-Service-Key": settings.INTERNAL_SERVICE_SECRET}


def _register_citizen(suffix: str = None) -> dict:
    suffix = suffix or uuid.uuid4().hex[:8]
    mobile = f"+9191{secrets.randbelow(90000000) + 10000000:08d}"
    email = f"cis_{suffix}@agrilink.in"
    res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": f"Test Citizen {suffix}",
            "email": email,
            "mobile": mobile,
            "password": "SecurePass@2026",
            "confirm_password": "SecurePass@2026",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _login(identifier: str) -> dict:
    res = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": identifier,
            "password": "SecurePass@2026",
        },
    )
    assert res.status_code == 200, res.text
    return res.json()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Consents Tests ─────────────────────────────────────────────────────────────


class TestConsents:
    def test_list_and_toggle_consents(self):
        reg = _register_citizen()
        token = _login(reg["email"])["access_token"]

        # List consents (created during registration)
        res = client.get("/api/v1/consents", headers=_auth_headers(token))
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert len(data) >= 1

        consent_id = data[0]["id"]
        assert data[0]["granted"] is True

        # Withdraw consent
        patch_res = client.patch(
            f"/api/v1/consents/{consent_id}",
            json={"granted": False},
            headers=_auth_headers(token),
        )
        assert patch_res.status_code == 200, patch_res.text
        assert patch_res.json()["granted"] is False
        assert patch_res.json()["withdrawn_at"] is not None

        # Re-grant consent
        patch_res2 = client.patch(
            f"/api/v1/consents/{consent_id}",
            json={"granted": True},
            headers=_auth_headers(token),
        )
        assert patch_res2.status_code == 200, patch_res2.text
        assert patch_res2.json()["granted"] is True
        assert patch_res2.json()["withdrawn_at"] is None


# ── Sessions Tests ─────────────────────────────────────────────────────────────


class TestSessions:
    def test_list_and_revoke_sessions(self):
        reg = _register_citizen()
        token = _login(reg["email"])["access_token"]

        # List active sessions
        res = client.get("/api/v1/sessions", headers=_auth_headers(token))
        assert res.status_code == 200, res.text
        sessions = res.json()["data"]
        assert len(sessions) >= 1

        # Revoke other sessions
        revoke_res = client.post(
            "/api/v1/sessions/revoke-others",
            headers=_auth_headers(token),
        )
        assert revoke_res.status_code == 200, revoke_res.text


# ── Admin & Approval Tests ─────────────────────────────────────────────────────


class TestAdmin:
    def test_admin_persona_decide_flow(self):
        reg = _register_citizen()
        token = _login(reg["email"])["access_token"]

        # Citizen applies for FARMER persona (restricted -> goes to PENDING)
        apply_res = client.post(
            "/api/v1/personas",
            json={
                "persona_type": "FARMER",
                "display_name": "Organic Farmer",
            },
            headers=_auth_headers(token),
        )
        assert apply_res.status_code == 201, apply_res.text
        persona_id = apply_res.json()["persona_id"]

        # Admin lists pending persona applications
        admin_res = client.get(
            "/api/v1/admin/persona-applications", headers=INTERNAL_HEADER
        )
        assert admin_res.status_code == 200, admin_res.text
        pending_list = admin_res.json()["data"]
        matching = [item for item in pending_list if item["persona_id"] == persona_id]
        assert len(matching) == 1

        # Admin approves application
        decide_res = client.post(
            f"/api/v1/admin/persona-applications/{persona_id}/decide",
            json={"decision": "APPROVED", "reason_code": "VERIFIED_DOCS"},
            headers=INTERNAL_HEADER,
        )
        assert decide_res.status_code == 200, decide_res.text
        assert decide_res.json()["decision"] == "APPROVED"

        # Verify citizen now has ACTIVE farmer persona
        personas_res = client.get("/api/v1/personas", headers=_auth_headers(token))
        assert personas_res.status_code == 200
        farmer_p = [p for p in personas_res.json()["data"] if p["id"] == persona_id][0]
        assert farmer_p["status"] == "ACTIVE"

    def test_admin_kyc_review_flow(self):
        reg = _register_citizen()
        token = _login(reg["email"])["access_token"]

        # Upload a dummy KYC document to create a KYC record
        file_bytes = b"%PDF-1.4 dummy test document content"
        upload_res = client.post(
            "/api/v1/kyc/documents",
            data={"document_type": "AADHAAR", "document_number": "123456789012"},
            files={"file": ("aadhaar.pdf", file_bytes, "application/pdf")},
            headers=_auth_headers(token),
        )
        assert upload_res.status_code == 201, upload_res.text
        kyc_record_id = upload_res.json()["kyc_record_id"]
        doc_id = upload_res.json()["document_id"]

        # Admin reviews KYC record
        review_res = client.post(
            f"/api/v1/admin/kyc/{kyc_record_id}/review",
            json={
                "decision": "VERIFIED",
                "kyc_tier": "T1",
                "reason_code": "CLEAN_RECORD",
            },
            headers=INTERNAL_HEADER,
        )
        assert review_res.status_code == 200, review_res.text
        assert review_res.json()["status"] == "VERIFIED"
        assert review_res.json()["kyc_tier"] == "T1"

        # Check signed URL endpoint works
        signed_res = client.get(
            f"/api/v1/kyc/documents/{doc_id}/signed-url",
            headers=_auth_headers(token),
        )
        assert signed_res.status_code == 200, signed_res.text
        assert signed_res.json()["document_id"] == doc_id

    def test_admin_audit_and_limits(self):
        # Query audit logs
        audit_res = client.get("/api/v1/admin/audit?limit=10", headers=INTERNAL_HEADER)
        assert audit_res.status_code == 200, audit_res.text

        # Query wallet limits
        limits_res = client.get("/api/v1/admin/limits", headers=INTERNAL_HEADER)
        assert limits_res.status_code == 200, limits_res.text


# ── Avatar Upload Test ─────────────────────────────────────────────────────────


class TestAvatar:
    def test_avatar_upload(self):
        reg = _register_citizen()
        token = _login(reg["email"])["access_token"]

        dummy_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
        res = client.post(
            "/api/v1/citizens/me/avatar",
            files={"file": ("avatar.jpg", dummy_jpeg, "image/jpeg")},
            headers=_auth_headers(token),
        )
        assert res.status_code == 200, res.text
        assert res.json()["success"] is True
        assert "storage_key" in res.json()["data"]
