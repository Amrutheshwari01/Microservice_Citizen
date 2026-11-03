import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_full_lifecycle():
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"test_{unique_suffix}@agrilink.in"
    mobile = f"+9198{uuid.uuid4().int % 100000000:08d}"
    password = "StrongPassword@123"

    # 1. Register
    reg_payload = {
        "full_name": "Ramesh Kumar",
        "email": email,
        "mobile": mobile,
        "password": password,
        "confirm_password": password,
        "preferred_language": "en",
        "nationality_code": "IN",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    reg_data = reg_res.json()
    assert reg_data["success"] is True
    assert reg_data["email"] == email
    assert reg_data["mobile"] == mobile
    # 2. Duplicate registration fails with 409 Conflict
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 409

    # 3. Request OTP
    otp_req = client.post(
        "/api/v1/auth/otp/request", json={"destination": mobile, "purpose": "LOGIN"}
    )
    assert otp_req.status_code == 200
    otp_data = otp_req.json()
    dev_otp = otp_data["dev_otp"]

    # 4. Verify OTP
    otp_ver = client.post(
        "/api/v1/auth/otp/verify",
        json={"destination": mobile, "code": dev_otp, "purpose": "LOGIN"},
    )
    assert otp_ver.status_code == 200
    assert otp_ver.json()["success"] is True

    # 5. Login with correct credentials
    login_res = client.post(
        "/api/v1/auth/login", json={"identifier": email, "password": password}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["success"] is True
    assert "access_token" in login_data
    assert "refresh_token" in login_data
    assert login_data["active_persona"] == "CUSTOMER"

    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]

    # 6. Login with incorrect password fails with 401
    bad_login = client.post(
        "/api/v1/auth/login", json={"identifier": email, "password": "WrongPassword"}
    )
    assert bad_login.status_code == 401

    # 7. Refresh token
    refresh_res = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()

    # 8. Logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"refresh_token": refresh_token},
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True
