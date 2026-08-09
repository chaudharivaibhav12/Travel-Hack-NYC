"""
Unit tests for backend/main.py.

These tests never touch a real Supabase project — the `supabase` client used
by the FastAPI app is replaced with a MagicMock in every test via the
`mock_supabase` fixture, so they run offline and don't need real credentials.
For a real Supabase connectivity check, see scripts/check_supabase_connection.py.
"""
import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import main  # noqa: E402  (import after sys.path/env setup in conftest.py)


@pytest.fixture
def mock_supabase(monkeypatch):
    """Replace the module-level `supabase` client with a MagicMock."""
    mock = MagicMock()
    monkeypatch.setattr(main, "supabase", mock)
    return mock


@pytest.fixture
def client():
    return TestClient(main.app, raise_server_exceptions=False)


# ─── Health check ──────────────────────────────────────────────────────────

def test_root_health_check(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "GroupGo API running"}


# ─── /auth/google ──────────────────────────────────────────────────────────

def test_google_login_redirects_to_supabase_oauth_url(client, mock_supabase):
    mock_supabase.auth.sign_in_with_oauth.return_value = SimpleNamespace(
        url="https://example.supabase.co/auth/v1/authorize?provider=google"
    )

    resp = client.get("/auth/google", follow_redirects=False)

    assert resp.status_code in (302, 307)
    assert resp.headers["location"] == "https://example.supabase.co/auth/v1/authorize?provider=google"
    mock_supabase.auth.sign_in_with_oauth.assert_called_once()
    call_kwargs = mock_supabase.auth.sign_in_with_oauth.call_args[0][0]
    assert call_kwargs["provider"] == "google"
    assert "redirect_to" in call_kwargs["options"]


def test_google_login_uses_redirect_url_env_var(client, mock_supabase, monkeypatch):
    monkeypatch.setenv("REDIRECT_URL", "https://app.example.com/auth/callback")
    mock_supabase.auth.sign_in_with_oauth.return_value = SimpleNamespace(url="https://x/authorize")

    client.get("/auth/google", follow_redirects=False)

    call_kwargs = mock_supabase.auth.sign_in_with_oauth.call_args[0][0]
    assert call_kwargs["options"]["redirect_to"] == "https://app.example.com/auth/callback"


# ─── /auth/callback ────────────────────────────────────────────────────────

def test_auth_callback_without_error_redirects_to_frontend(client, monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com")

    resp = client.get("/auth/callback", follow_redirects=False)

    assert resp.status_code in (302, 307)
    assert resp.headers["location"] == "https://app.example.com"


def test_auth_callback_with_error_returns_400(client):
    resp = client.get("/auth/callback", params={"error": "access_denied"})

    assert resp.status_code == 400
    assert "access_denied" in resp.json()["detail"]


# ─── /auth/verify ──────────────────────────────────────────────────────────

def test_verify_token_success_returns_user_info(client, mock_supabase):
    fake_user = SimpleNamespace(
        id="user-123",
        email="jane@example.com",
        user_metadata={"full_name": "Jane Doe", "avatar_url": "https://avatar.example/jane.png"},
    )
    mock_supabase.auth.get_user.return_value = SimpleNamespace(user=fake_user)

    resp = client.post("/auth/verify", json={"access_token": "valid-token"})

    assert resp.status_code == 200
    assert resp.json() == {
        "id": "user-123",
        "email": "jane@example.com",
        "name": "Jane Doe",
        "avatar": "https://avatar.example/jane.png",
    }
    mock_supabase.auth.get_user.assert_called_once_with("valid-token")


def test_verify_token_missing_user_returns_401(client, mock_supabase):
    mock_supabase.auth.get_user.return_value = SimpleNamespace(user=None)

    resp = client.post("/auth/verify", json={"access_token": "bad-token"})

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid token"


def test_verify_token_none_response_returns_401(client, mock_supabase):
    mock_supabase.auth.get_user.return_value = None

    resp = client.post("/auth/verify", json={"access_token": "bad-token"})

    assert resp.status_code == 401


def test_verify_token_supabase_exception_returns_401(client, mock_supabase):
    mock_supabase.auth.get_user.side_effect = Exception("token expired")

    resp = client.post("/auth/verify", json={"access_token": "expired-token"})

    assert resp.status_code == 401
    assert "token expired" in resp.json()["detail"]


def test_verify_token_requires_access_token_field(client):
    resp = client.post("/auth/verify", json={})
    assert resp.status_code == 422


# ─── /auth/logout ──────────────────────────────────────────────────────────

def test_logout_success(client, mock_supabase):
    resp = client.post("/auth/logout", json={"access_token": "valid-token"})

    assert resp.status_code == 200
    assert resp.json() == {"message": "Logged out successfully"}
    mock_supabase.auth.sign_out.assert_called_once()


def test_logout_failure_returns_400(client, mock_supabase):
    mock_supabase.auth.sign_out.side_effect = Exception("sign out failed")

    resp = client.post("/auth/logout", json={"access_token": "valid-token"})

    assert resp.status_code == 400
    assert "sign out failed" in resp.json()["detail"]


# ─── /trips ────────────────────────────────────────────────────────────────

def _chain(mock_supabase, table_name):
    """Return the mock for supabase.table(table_name) so callers can configure it."""
    table_mock = MagicMock()
    mock_supabase.table.side_effect = lambda name: table_mock if name == table_name else MagicMock()
    return table_mock


def test_create_trip_success(client, mock_supabase):
    table_mock = _chain(mock_supabase, "trips")
    table_mock.insert.return_value.execute.return_value = SimpleNamespace(
        data=[{"id": "trip-1", "event_name": "Cabo Bachelor Party"}]
    )

    resp = client.post("/trips", json={
        "event_name": "Cabo Bachelor Party",
        "event_location": "Cabo San Lucas",
        "lat": 22.89,
        "lng": -109.91,
        "checkin": "2026-09-01",
        "checkout": "2026-09-05",
        "user_id": "user-123",
    })

    assert resp.status_code == 200
    assert resp.json()["trip_id"] == "trip-1"


def test_create_trip_failure_returns_500(client, mock_supabase):
    table_mock = _chain(mock_supabase, "trips")
    table_mock.insert.return_value.execute.return_value = SimpleNamespace(data=[])

    resp = client.post("/trips", json={
        "event_name": "Cabo Bachelor Party",
        "event_location": "Cabo San Lucas",
        "lat": 22.89,
        "lng": -109.91,
        "checkin": "2026-09-01",
        "checkout": "2026-09-05",
        "user_id": "user-123",
    })

    assert resp.status_code == 500


def test_create_trip_supabase_exception_returns_400_with_detail(client, mock_supabase):
    table_mock = _chain(mock_supabase, "trips")
    table_mock.insert.return_value.execute.side_effect = Exception(
        'invalid input syntax for type uuid: "demo-user"'
    )

    resp = client.post("/trips", json={
        "event_name": "Cabo Bachelor Party",
        "event_location": "Cabo San Lucas",
        "lat": 22.89,
        "lng": -109.91,
        "checkin": "2026-09-01",
        "checkout": "2026-09-05",
        "user_id": "demo-user",
    })

    assert resp.status_code == 400
    assert "uuid" in resp.json()["detail"]


def test_list_trips_returns_trips_for_user(client, mock_supabase):
    table_mock = _chain(mock_supabase, "trips")
    table_mock.select.return_value.eq.return_value.order.return_value.execute.return_value = SimpleNamespace(
        data=[{"id": "trip-1", "event_name": "Cabo Bachelor Party", "created_by": "user-123"}]
    )

    resp = client.get("/trips", params={"user_id": "user-123"})

    assert resp.status_code == 200
    assert resp.json() == {
        "trips": [{"id": "trip-1", "event_name": "Cabo Bachelor Party", "created_by": "user-123"}]
    }
    table_mock.select.return_value.eq.assert_called_once_with("created_by", "user-123")


def test_list_trips_returns_empty_list_on_supabase_exception(client, mock_supabase):
    table_mock = _chain(mock_supabase, "trips")
    table_mock.select.return_value.eq.return_value.order.return_value.execute.side_effect = Exception(
        'invalid input syntax for type uuid: "demo-user"'
    )

    resp = client.get("/trips", params={"user_id": "demo-user"})

    assert resp.status_code == 200
    assert resp.json() == {"trips": []}


def test_list_trips_requires_user_id(client):
    resp = client.get("/trips")
    assert resp.status_code == 422


def test_list_trips_returns_empty_list_when_none_found(client, mock_supabase):
    table_mock = _chain(mock_supabase, "trips")
    table_mock.select.return_value.eq.return_value.order.return_value.execute.return_value = SimpleNamespace(
        data=None
    )

    resp = client.get("/trips", params={"user_id": "user-123"})

    assert resp.status_code == 200
    assert resp.json() == {"trips": []}


def test_get_trip_not_found_returns_404(client, mock_supabase):
    table_mock = _chain(mock_supabase, "trips")
    table_mock.select.return_value.eq.return_value.single.return_value.execute.return_value = SimpleNamespace(
        data=None
    )

    resp = client.get("/trips/does-not-exist")

    assert resp.status_code == 404


# ─── /members/{trip_id}/consensus ─────────────────────────────────────────

def test_consensus_no_members_returns_404(client, mock_supabase):
    table_mock = _chain(mock_supabase, "members")
    table_mock.select.return_value.eq.return_value.execute.return_value = SimpleNamespace(data=[])

    resp = client.get("/members/trip-1/consensus")

    assert resp.status_code == 404


def test_consensus_computes_overlapping_budget_range(client, mock_supabase):
    table_mock = _chain(mock_supabase, "members")
    table_mock.select.return_value.eq.return_value.execute.return_value = SimpleNamespace(data=[
        {"name": "Alice", "budget_min": 200, "budget_max": 800, "origin_airport": "JFK", "origin_city": "NYC", "vibe_params": {"vibe": "chill"}},
        {"name": "Bob", "budget_min": 300, "budget_max": 600, "origin_airport": "LAX", "origin_city": "LA", "vibe_params": {"vibe": "party"}},
    ])

    resp = client.get("/members/trip-1/consensus")

    assert resp.status_code == 200
    body = resp.json()
    assert body["member_count"] == 2
    # highest floor, lowest ceiling
    assert body["budget_consensus"] == {"min": 300, "max": 600}
    assert len(body["origins"]) == 2


def test_consensus_falls_back_to_average_when_no_overlap(client, mock_supabase):
    table_mock = _chain(mock_supabase, "members")
    table_mock.select.return_value.eq.return_value.execute.return_value = SimpleNamespace(data=[
        {"name": "Alice", "budget_min": 100, "budget_max": 200, "origin_airport": "JFK", "origin_city": "NYC", "vibe_params": {}},
        {"name": "Bob", "budget_min": 900, "budget_max": 1200, "origin_airport": "LAX", "origin_city": "LA", "vibe_params": {}},
    ])

    resp = client.get("/members/trip-1/consensus")

    assert resp.status_code == 200
    body = resp.json()
    # no overlap (900 > 200) -> falls back to averages: min=(100+900)/2=500, max=(200+1200)/2=700
    assert body["budget_consensus"] == {"min": 500, "max": 700}
