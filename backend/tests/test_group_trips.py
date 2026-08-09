from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import main
from api.dependencies import get_supabase


@pytest.fixture
def mock_supabase():
    mock = MagicMock()
    main.app.dependency_overrides[get_supabase] = lambda: mock
    yield mock
    main.app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(main.app, raise_server_exceptions=False)


def test_create_group_trip(client, mock_supabase):
    table = MagicMock()
    mock_supabase.table.return_value = table
    table.insert.return_value.execute.return_value = SimpleNamespace(
        data=[{"id": "trip-1", "title": "NYC Weekend"}]
    )

    response = client.post("/group-trips", json={
        "title": "NYC Weekend",
        "destination": "New York",
        "checkin": "2026-09-01",
        "checkout": "2026-09-04",
        "organizer_email": "organizer@example.com",
        "invited_emails": ["friend@example.com"],
    })

    assert response.status_code == 200
    assert response.json()["trip_id"] == "trip-1"
    mock_supabase.table.assert_called_with("group_trips")


def test_get_group_trip_not_found(client, mock_supabase):
    table = MagicMock()
    mock_supabase.table.return_value = table
    table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
        SimpleNamespace(data=None)
    )

    response = client.get("/group-trips/missing")

    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


def test_generate_context_requires_completed_surveys(client, mock_supabase):
    trip_table = MagicMock()
    survey_table = MagicMock()

    def table(name):
        return trip_table if name == "group_trips" else survey_table

    mock_supabase.table.side_effect = table
    trip_table.select.return_value.eq.return_value.single.return_value.execute.return_value = (
        SimpleNamespace(data={"id": "trip-1"})
    )
    survey_table.select.return_value.eq.return_value.not_.is_.return_value.execute.return_value = (
        SimpleNamespace(data=[])
    )

    response = client.get("/group-trips/trip-1/generate-context")

    assert response.status_code == 400
    assert response.json()["detail"] == "No completed surveys for this trip"
