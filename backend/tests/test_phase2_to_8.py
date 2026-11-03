"""
Integration tests for Citizen Profile, Personas, Wallet, and Internal APIs.
These tests run against the live Supabase database.
Each test creates fresh data with unique identifiers.
"""
import uuid
import secrets
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)
INTERNAL_HEADER = {"X-Service-Key": settings.INTERNAL_SERVICE_SECRET}


def _register_citizen(suffix: str = None) -> dict:
    """Helper: register a fresh citizen and return parsed response data."""
    suffix = suffix or uuid.uuid4().hex[:8]
    mobile = f"+9191{secrets.randbelow(90000000) + 10000000:08d}"
    email = f"cis_{suffix}@agrilink.in"
    res = client.post("/api/v1/auth/register", json={
        "full_name": f"Test Citizen {suffix}",
        "email": email,
        "mobile": mobile,
        "password": "SecurePass@2026",
        "confirm_password": "SecurePass@2026",
    })
    assert res.status_code == 201, res.text
    return res.json()


def _login(identifier: str) -> dict:
    """Helper: login and return token response."""
    res = client.post("/api/v1/auth/login", json={
        "identifier": identifier,
        "password": "SecurePass@2026",
    })
    assert res.status_code == 200, res.text
    return res.json()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Profile Tests ──────────────────────────────────────────────────────────────

class TestProfile:
    def test_get_profile(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        res = client.get("/api/v1/citizens/me", headers=_auth_headers(token))
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert data["email"] == reg["email"]
        assert data["status"] == "ACTIVE"
        assert "CUSTOMER" in data["active_personas"]
        assert data["kyc_tier"] == "T0"

    def test_update_profile(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        update_data = {
            "full_name": "Updated Name",
            "preferred_language": "hi",
            "city": "Bangalore",
            "state_region": "Karnataka",
            "postal_code": "560001",
        }
        res = client.patch("/api/v1/citizens/me", json=update_data, headers=_auth_headers(token))
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert data["full_name"] == "Updated Name"
        assert data["city"] == "Bangalore"
        assert data["preferred_language"] == "hi"

    def test_profile_history_recorded(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        # Update profile
        client.patch("/api/v1/citizens/me", json={"city": "Mysore"}, headers=_auth_headers(token))

        # Check history
        res = client.get("/api/v1/citizens/me/history", headers=_auth_headers(token))
        assert res.status_code == 200
        history = res.json()["data"]
        assert len(history) >= 1
        assert "city" in history[0]["changed_fields"]

    def test_unauthenticated_profile_returns_401(self):
        res = client.get("/api/v1/citizens/me")
        assert res.status_code == 401


# ── Persona Tests ──────────────────────────────────────────────────────────────

class TestPersonas:
    def test_customer_persona_auto_active(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        res = client.get("/api/v1/personas", headers=_auth_headers(token))
        assert res.status_code == 200
        personas = res.json()["data"]
        types = [p["persona_type"] for p in personas]
        assert "CUSTOMER" in types
        customer = next(p for p in personas if p["persona_type"] == "CUSTOMER")
        assert customer["status"] == "ACTIVE"

    def test_apply_farmer_persona_goes_pending(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        res = client.post("/api/v1/personas", json={"persona_type": "FARMER"}, headers=_auth_headers(token))
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["persona_type"] == "FARMER"
        assert data["status"] == "PENDING"
        assert data["approval_required"] is True

    def test_apply_buyer_alias_maps_to_customer(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        # CUSTOMER already exists, so apply BUYER (which maps to CUSTOMER) should conflict
        res = client.post("/api/v1/personas", json={"persona_type": "BUYER"}, headers=_auth_headers(token))
        assert res.status_code == 409  # CUSTOMER already exists

    def test_duplicate_persona_returns_409(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        client.post("/api/v1/personas", json={"persona_type": "FARMER"}, headers=_auth_headers(token))
        res = client.post("/api/v1/personas", json={"persona_type": "FARMER"}, headers=_auth_headers(token))
        assert res.status_code == 409


# ── Wallet Tests ───────────────────────────────────────────────────────────────

class TestWallet:
    def test_wallet_exists_after_registration(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        res = client.get("/api/v1/wallets/me", headers=_auth_headers(token))
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["currency_code"] == "INR"
        assert data["status"] == "ACTIVE"
        assert Decimal(data["available_balance"]) == Decimal("0.0000")

    def test_topup_credits_wallet(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        topup_res = client.post("/api/v1/wallets/topup", json={
            "amount": "500.00",
            "provider_name": "UPI",
            "provider_reference": "UTR1234",
            "idempotency_key": f"topup-{uuid.uuid4().hex}",
        }, headers=_auth_headers(token))
        assert topup_res.status_code == 201, topup_res.text

        wallet_res = client.get("/api/v1/wallets/me", headers=_auth_headers(token))
        balance = Decimal(wallet_res.json()["data"]["available_balance"])
        assert balance == Decimal("500.0000")

    def test_transfer_between_citizens(self):
        # Use unique suffixes each run so the test never conflicts with prior data
        run_id = uuid.uuid4().hex[:6]
        alice = _register_citizen(f"alice_{run_id}")
        bob = _register_citizen(f"bob_{run_id}")

        alice_token = _login(alice["email"])["access_token"]
        bob_token = _login(bob["email"])["access_token"]

        # Top up Alice
        client.post("/api/v1/wallets/topup", json={
            "amount": "1000.00",
            "provider_name": "NETBANKING",
            "provider_reference": "NB001",
            "idempotency_key": f"topup-alice-{uuid.uuid4().hex}",
        }, headers=_auth_headers(alice_token))

        # Transfer ₹300 from Alice to Bob
        transfer_res = client.post("/api/v1/wallets/transfer", json={
            "recipient_identifier": bob["mobile"],
            "amount": "300.00",
            "description": "Test transfer",
            "idempotency_key": f"tx-{uuid.uuid4().hex}",
        }, headers=_auth_headers(alice_token))
        assert transfer_res.status_code == 201, transfer_res.text

        # Verify Alice's balance decreased
        alice_wallet = client.get("/api/v1/wallets/me", headers=_auth_headers(alice_token)).json()["data"]
        assert Decimal(alice_wallet["available_balance"]) == Decimal("700.0000")

        # Verify Bob's balance increased
        bob_wallet = client.get("/api/v1/wallets/me", headers=_auth_headers(bob_token)).json()["data"]
        assert Decimal(bob_wallet["available_balance"]) == Decimal("300.0000")

    def test_insufficient_funds_returns_400(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        other = _register_citizen()

        res = client.post("/api/v1/wallets/transfer", json={
            "recipient_identifier": other["email"],
            "amount": "9999.00",
            "idempotency_key": f"fail-{uuid.uuid4().hex}",
        }, headers=_auth_headers(token))
        assert res.status_code == 400
        assert "INSUFFICIENT_FUNDS" in res.json()["code"]

    def test_duplicate_idempotency_key_rejected(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        idem_key = f"idem-{uuid.uuid4().hex}"
        client.post("/api/v1/wallets/topup", json={
            "amount": "100.00",
            "provider_name": "UPI",
            "idempotency_key": idem_key,
        }, headers=_auth_headers(token))

        res2 = client.post("/api/v1/wallets/topup", json={
            "amount": "100.00",
            "provider_name": "UPI",
            "idempotency_key": idem_key,
        }, headers=_auth_headers(token))
        assert res2.status_code == 409

    def test_transaction_history(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        # Top up so we have a transaction
        client.post("/api/v1/wallets/topup", json={
            "amount": "200.00",
            "provider_name": "UPI",
            "idempotency_key": f"hist-{uuid.uuid4().hex}",
        }, headers=_auth_headers(token))

        res = client.get("/api/v1/wallets/me/transactions", headers=_auth_headers(token))
        assert res.status_code == 200
        txs = res.json()["data"]
        assert len(txs) >= 1
        assert txs[0]["transaction_type"] == "TOPUP"


# ── Internal API Tests ─────────────────────────────────────────────────────────

class TestInternalAPIs:
    def test_citizen_status_endpoint(self):
        reg = _register_citizen()
        citizen_id = reg["citizen_id"]

        res = client.get(f"/api/v1/internal/citizens/{citizen_id}/status", headers=INTERNAL_HEADER)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "ACTIVE"
        assert data["kyc_tier"] == "T0"

    def test_citizen_personas_endpoint(self):
        reg = _register_citizen()
        citizen_id = reg["citizen_id"]

        res = client.get(f"/api/v1/internal/citizens/{citizen_id}/personas", headers=INTERNAL_HEADER)
        assert res.status_code == 200
        data = res.json()
        types = [p["persona_type"] for p in data["active_personas"]]
        assert "CUSTOMER" in types

    def test_citizen_eligibility_customer(self):
        reg = _register_citizen()
        citizen_id = reg["citizen_id"]

        res = client.get(
            f"/api/v1/internal/citizens/{citizen_id}/eligibility?persona=CUSTOMER",
            headers=INTERNAL_HEADER,
        )
        assert res.status_code == 200
        assert res.json()["eligible"] is True

    def test_citizen_eligibility_farmer_false_by_default(self):
        reg = _register_citizen()
        citizen_id = reg["citizen_id"]

        res = client.get(
            f"/api/v1/internal/citizens/{citizen_id}/eligibility?persona=FARMER",
            headers=INTERNAL_HEADER,
        )
        assert res.status_code == 200
        assert res.json()["eligible"] is False

    def test_internal_hold_and_release(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]
        citizen_id = reg["citizen_id"]

        # Top up wallet first
        client.post("/api/v1/wallets/topup", json={
            "amount": "500.00",
            "provider_name": "UPI",
            "idempotency_key": f"pre-hold-{uuid.uuid4().hex}",
        }, headers=_auth_headers(token))

        # Get wallet_id from status endpoint
        status_res = client.get(
            f"/api/v1/internal/citizens/{citizen_id}/status", headers=INTERNAL_HEADER
        )
        wallet_id = status_res.json()["wallet_id"]

        # Place hold
        hold_res = client.post(f"/api/v1/internal/wallets/{wallet_id}/hold", json={
            "amount": "200.00",
            "reason_code": "ORDER_PAYMENT",
            "idempotency_key": f"hold-{uuid.uuid4().hex}",
            "expires_in_hours": 24,
        }, headers=INTERNAL_HEADER)
        assert hold_res.status_code == 201, hold_res.text
        hold_id = hold_res.json()["hold_id"]

        # Balance should be reduced by hold
        wallet_res = client.get("/api/v1/wallets/me", headers=_auth_headers(token))
        balance_after_hold = Decimal(wallet_res.json()["data"]["available_balance"])
        assert balance_after_hold == Decimal("300.0000")

        # Release hold
        release_res = client.post(
            f"/api/v1/internal/wallets/{wallet_id}/release?hold_id={hold_id}",
            headers=INTERNAL_HEADER,
        )
        assert release_res.status_code == 200

        # Balance should be restored
        wallet_res2 = client.get("/api/v1/wallets/me", headers=_auth_headers(token))
        final_balance = Decimal(wallet_res2.json()["data"]["available_balance"])
        assert final_balance == Decimal("500.0000")

    def test_token_introspection(self):
        reg = _register_citizen()
        login = _login(reg["email"])
        token = login["access_token"]

        res = client.post(
            "/api/v1/internal/tokens/introspect",
            json={"token": token},
            headers=INTERNAL_HEADER,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["active"] is True
        assert data["citizen_id"] == reg["citizen_id"]

    def test_invalid_service_key_returns_403(self):
        res = client.get(
            "/api/v1/internal/citizens/00000000-0000-0000-0000-000000000000/status",
            headers={"X-Service-Key": "wrong-secret"},
        )
        assert res.status_code == 403
