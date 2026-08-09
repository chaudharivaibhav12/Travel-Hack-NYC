from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import main
from api.dependencies import get_supabase
from api.routers import plans as plans_router
from services.claude import GeneratedItinerary, generate_fallback


@pytest.fixture
def mock_supabase():
    mock = MagicMock()
    main.app.dependency_overrides[get_supabase] = lambda: mock
    yield mock
    main.app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(main.app, raise_server_exceptions=False)


def table_with_rows(rows):
    table = MagicMock()
    table.select.return_value.eq.return_value.execute.return_value = SimpleNamespace(data=rows)
    table.select.return_value.eq.return_value.eq.return_value.execute.return_value = SimpleNamespace(data=rows)
    table.select.return_value.eq.return_value.single.return_value.execute.return_value = SimpleNamespace(
        data=rows[0] if rows else None
    )
    return table


def configure_plan(mock_supabase, complete=True):
    trip = {
        "id": "trip-1", "event_name": "Rome", "event_location": "Rome, Italy",
        "lat": 41.9, "lng": 12.5, "checkin": "2026-08-11", "checkout": "2026-08-13",
        "created_by": "user-1",
    }
    tables = {
        "trips": table_with_rows([trip]),
        "members": table_with_rows([{"id": "member-1", "name": "Alice"}]),
        "preferences_travel": table_with_rows([{"origin_airport": "JFK", "departure_date": "2026-08-11"}]),
        "preferences_stay": table_with_rows([{"budget_min": 100, "budget_max": 250, "property_types": ["hotel"], "vibes": ["cozy"], "needs": []}]),
        "preferences_food": table_with_rows([{"cuisines": ["italian"], "dietary": [], "meal_budget": "mid"}]),
        "preferences_activities": table_with_rows([{"interests": ["museums"], "pace": "relaxed", "must_sees": "Colosseum"}]) if complete else table_with_rows([]),
    }
    itinerary_table = MagicMock()
    itinerary_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = SimpleNamespace(data=[])
    itinerary_table.insert.return_value.execute.return_value = SimpleNamespace(data=[])
    tables["trip_itineraries"] = itinerary_table
    mock_supabase.table.side_effect = lambda name: tables[name]
    return itinerary_table


def test_generate_itinerary_requires_all_preferences(client, mock_supabase, monkeypatch):
    configure_plan(mock_supabase, complete=False)
    monkeypatch.setattr(plans_router, "search_accommodations", lambda **kwargs: {"available": False, "accommodations": []})

    response = client.post("/trips/trip-1/itinerary")

    assert response.status_code == 409
    assert "Complete travel" in response.json()["detail"]


def test_generate_itinerary_uses_provider_and_attempts_persistence(client, mock_supabase, monkeypatch):
    itinerary_table = configure_plan(mock_supabase)
    monkeypatch.setattr(plans_router, "search_accommodations", lambda **kwargs: {"available": False, "accommodations": []})
    generated = GeneratedItinerary.model_validate({
        "summary": "Two relaxed days in Rome.",
        "days": [{
            "date": "2026-08-11", "title": "Ancient Rome", "items": [{
                "time_period": "Morning", "title": "Colosseum", "location": "Colosseum",
                "description": "Visit the landmark.", "rationale": "It is the saved must-see.",
            }],
        }],
        "practical_tips": ["Book ahead."], "generated_by": "claude",
    })
    monkeypatch.setattr(plans_router, "generate_itinerary", lambda context: generated)

    response = client.post("/trips/trip-1/itinerary")

    assert response.status_code == 200
    assert response.json()["itinerary"]["content"]["generated_by"] == "claude"
    itinerary_table.insert.assert_called_once()


def test_fallback_covers_every_trip_day():
    result = generate_fallback({
        "trip": {"event_location": "Rome", "checkin": "2026-08-11", "checkout": "2026-08-13"},
        "consensus": {
            "activities": {"interests": ["museums"], "pace": "relaxed", "must_sees": []},
            "food": {"cuisines": ["italian"]},
        },
    })

    assert result.generated_by == "fallback"
    assert [day.date for day in result.days] == ["2026-08-11", "2026-08-12"]
