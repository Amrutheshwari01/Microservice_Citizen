from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from app.core.config import settings
from app.core.exceptions import ServiceUnavailableException, UnauthorizedException
from app.services.auth_service import AuthService


def test_google_login_uses_verified_email_and_issues_session(monkeypatch):
    citizen = SimpleNamespace(status="ACTIVE", email_normalized="citizen@example.com")
    service = AuthService(Mock())
    service.repo.get_by_email = Mock(return_value=citizen)
    expected_response = object()
    issue_tokens = Mock(return_value=expected_response)
    monkeypatch.setattr(service, "_issue_login_tokens", issue_tokens)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "client-id")
    verify_token = Mock(
        return_value={"email": "citizen@example.com", "email_verified": True}
    )
    monkeypatch.setattr(
        "app.services.auth_service.google_id_token.verify_oauth2_token",
        verify_token,
    )

    response = service.login_with_google(
        "google-id-token",
        ip_address="127.0.0.1",
        user_agent="browser",
    )

    assert response is expected_response
    assert verify_token.call_count == 1
    assert verify_token.call_args.args[0] == "google-id-token"
    assert verify_token.call_args.args[2] == "client-id"
    service.repo.get_by_email.assert_called_once_with("citizen@example.com")
    issue_tokens.assert_called_once_with(
        citizen,
        device_label="web (Google Sign-In)",
        ip_address="127.0.0.1",
        user_agent="browser",
    )


def test_google_login_rejects_unverified_email(monkeypatch):
    service = AuthService(Mock())
    service.repo.get_by_email = Mock()
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(
        "app.services.auth_service.google_id_token.verify_oauth2_token",
        Mock(return_value={"email": "citizen@example.com", "email_verified": False}),
    )

    with pytest.raises(UnauthorizedException, match="verified email"):
        service.login_with_google("google-id-token")

    service.repo.get_by_email.assert_not_called()


def test_google_login_requires_existing_citizen_account(monkeypatch):
    service = AuthService(Mock())
    service.repo.get_by_email = Mock(return_value=None)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(
        "app.services.auth_service.google_id_token.verify_oauth2_token",
        Mock(return_value={"email": "new@example.com", "email_verified": True}),
    )

    with pytest.raises(UnauthorizedException, match="Create an account first"):
        service.login_with_google("google-id-token")


def test_google_login_requires_server_configuration(monkeypatch):
    service = AuthService(Mock())
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")

    with pytest.raises(ServiceUnavailableException, match="not configured"):
        service.login_with_google("google-id-token")
