import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "ok"
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time-Ms" in response.headers


def test_health_db_endpoint():
    response = client.get("/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["database"] == "connected"
    assert data["ping_result"] == 1
