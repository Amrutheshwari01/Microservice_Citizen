import base64
import io
import time
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _generate_test_face(r=150, g=120, b=100) -> str:
    img = Image.new("RGB", (100, 100), color=(r, g, b))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def test_face_recognition_registration_and_login():
    uid = str(int(time.time()))[-8:]
    mobile = f"+9197{uid}"
    email = f"bio_farmer_{uid}@agrilink.in"
    face_b64 = _generate_test_face(180, 140, 110)

    # 1. Register citizen with face biometric
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Suresh Biometric Farmer",
            "email": email,
            "mobile": mobile,
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!",
            "preferred_language": "hi",
            "nationality_code": "IN",
            "face_image": face_b64,
        },
    )
    assert reg_res.status_code == 201, reg_res.text
    data = reg_res.json()
    assert data["success"] is True
    assert "citizen_id" in data

    # 2. Login using Face Recognition
    login_res = client.post(
        "/api/v1/auth/login-face",
        json={
            "face_image": face_b64,
            "identifier": mobile,
            "device_label": "Automated Test Browser",
        },
    )
    assert login_res.status_code == 200, login_res.text
    login_data = login_res.json()
    assert login_data["success"] is True
    assert login_data["match_confidence"] >= 80.0
    assert "access_token" in login_data
    assert "refresh_token" in login_data
    assert login_data["active_persona"] == "CUSTOMER"
