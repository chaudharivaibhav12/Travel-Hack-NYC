"""
Unit tests for the Stay22 service and /accommodations API route.

All tests mock the requests library — no live API calls are made.
For a live smoke check, see scripts/check_stay22.py.
"""
from __future__ import annotations

import os
import sys
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.stay22 import (
    Stay22ServiceError,
    search_accommodations,
    unavailable_response,
    _normalize,
    _best_price,
    _booking_links,
)

import main  # noqa: E402
from api.routers import accommodations as accommodations_router  # noqa: E402
from api.routers import weather as weather_router  # noqa: E402


# ─── Fixtures ─────────────────────────────────────────────────────────────────

VALID_RAW_RESPONSE = {
    "meta": {
        "page": 1,
        "pageSize": 10,
        "total": 2,
        "hasMore": False,
        "currency": "USD",
        "nights": 3,
        "checkin": "2026-09-01",
        "checkout": "2026-09-04",
    },
    "results": [
        {
            "id": "hotel-abc",
            "name": "Grand Hotel",
            "type": "Hotel",
            "url": "https://www.stay22.com/allez/roam/hotel-abc?aid=test",
            "location": {
                "address": "123 Main St, New York, NY",
                "coordinates": {"lat": 40.7128, "lng": -74.0060},
                "distanceInMeters": 500,
            },
            "rating": {"score": 8.7},
            "suppliers": {
                "booking": {
                    "id": "bk-001",
                    "link": "https://www.stay22.com/allez/booking/bk-001?aid=test",
                    "price": {"total": 450},
                },
                "expedia": {
                    "id": "ex-001",
                    "link": "https://www.stay22.com/allez/expedia/ex-001?aid=test",
                    "price": {"total": 420},
                },
            },
        },
        {
            "id": "apt-xyz",
            "name": "Cozy Apartment",
            "type": "Apartment",
            "url": "https://www.stay22.com/allez/roam/apt-xyz?aid=test",
            "location": {
                "address": "456 Broadway, New York, NY",
                "coordinates": {"lat": 40.7589, "lng": -73.9851},
                "distanceInMeters": 1200,
            },
            "rating": {"score": 9.1},
            "suppliers": {
                "vrbo": {
                    "id": "vr-002",
                    "link": "https://www.stay22.com/allez/vrbo/vr-002?aid=test",
                    "price": {"total": 600},
                },
                "booking": {
                    "id": "bk-002",
                    "link": "https://www.stay22.com/allez/booking/bk-002?aid=test",
                    "price": None,  # supplier outage
                },
            },
        },
    ],
}

EMPTY_RAW_RESPONSE = {
    "meta": {
        "page": 1,
        "pageSize": 10,
        "total": 0,
        "hasMore": False,
        "currency": "USD",
        "nights": 3,
    },
    "results": [],
}


@pytest.fixture
def client():
    return TestClient(main.app, raise_server_exceptions=False)


# ─── 1. Valid Stay22 request → normalized response ─────────────────────────────

def test_search_accommodations_valid_request():
    mock_resp = MagicMock()
    mock_resp.json.return_value = VALID_RAW_RESPONSE
    mock_resp.raise_for_status.return_value = None

    with patch("services.stay22.requests.get", return_value=mock_resp) as mock_get:
        result = search_accommodations(
            address="New York City",
            checkin=date(2026, 9, 1),
            checkout=date(2026, 9, 4),
        )

    mock_get.assert_called_once()
    assert result["available"] is True
    assert result["total"] == 2
    assert result["nights"] == 3
    assert result["currency"] == "USD"
    assert len(result["accommodations"]) == 2


# ─── 2. Required-field validation ─────────────────────────────────────────────

def test_search_accommodations_requires_location():
    with pytest.raises(Stay22ServiceError, match="Either address or lat"):
        search_accommodations(checkin="2026-09-01", checkout="2026-09-04")


def test_api_endpoint_requires_checkin(client):
    resp = client.get("/accommodations", params={
        "address": "New York City",
        "checkout": "2026-09-04",
    })
    assert resp.status_code == 422


def test_api_endpoint_requires_checkout(client):
    resp = client.get("/accommodations", params={
        "address": "New York City",
        "checkin": "2026-09-01",
    })
    assert resp.status_code == 422


def test_api_endpoint_requires_address_or_coordinates(client):
    resp = client.get("/accommodations", params={
        "checkin": "2026-09-01",
        "checkout": "2026-09-04",
    })
    assert resp.status_code == 422


# ─── 3. Invalid dates ─────────────────────────────────────────────────────────

def test_api_endpoint_rejects_checkout_before_checkin(client):
    resp = client.get("/accommodations", params={
        "address": "New York City",
        "checkin": "2026-09-05",
        "checkout": "2026-09-01",
    })
    assert resp.status_code == 422
    assert "checkout" in resp.json()["detail"].lower()


def test_api_endpoint_rejects_same_day_checkin_checkout(client):
    resp = client.get("/accommodations", params={
        "address": "New York City",
        "checkin": "2026-09-01",
        "checkout": "2026-09-01",
    })
    assert resp.status_code == 422


# ─── 4. Invalid coordinates or destination ────────────────────────────────────

def test_api_endpoint_rejects_invalid_latitude(client):
    resp = client.get("/accommodations", params={
        "lat": 200,  # > 90
        "lng": -74.0,
        "checkin": "2026-09-01",
        "checkout": "2026-09-04",
    })
    assert resp.status_code == 422


def test_api_endpoint_rejects_invalid_longitude(client):
    resp = client.get("/accommodations", params={
        "lat": 40.7,
        "lng": -200,  # < -180
        "checkin": "2026-09-01",
        "checkout": "2026-09-04",
    })
    assert resp.status_code == 422


# ─── 5. Provider timeout ──────────────────────────────────────────────────────

def test_search_accommodations_timeout_returns_service_error():
    import requests as req_lib
    with patch("services.stay22.requests.get", side_effect=req_lib.Timeout()):
        with pytest.raises(Stay22ServiceError, match="timed out"):
            search_accommodations(
                address="New York City",
                checkin="2026-09-01",
                checkout="2026-09-04",
            )


def test_api_endpoint_returns_unavailable_on_timeout(client):
    with patch.object(accommodations_router, "search_accommodations", side_effect=Stay22ServiceError("Stay22 request timed out")):
        resp = client.get("/accommodations", params={
            "address": "New York City",
            "checkin": "2026-09-01",
            "checkout": "2026-09-04",
        })
    assert resp.status_code == 200
    assert resp.json()["available"] is False


# ─── 6. Provider HTTP error ───────────────────────────────────────────────────

def test_search_accommodations_http_error_raises_service_error():
    import requests as req_lib
    http_err = req_lib.HTTPError()
    mock_response = MagicMock()
    mock_response.status_code = 503
    http_err.response = mock_response

    with patch("services.stay22.requests.get") as mock_get:
        mock_get.return_value.raise_for_status.side_effect = http_err
        with pytest.raises(Stay22ServiceError, match="HTTP 503"):
            search_accommodations(
                address="New York City",
                checkin="2026-09-01",
                checkout="2026-09-04",
            )


def test_api_endpoint_returns_unavailable_on_http_error(client):
    with patch.object(accommodations_router, "search_accommodations", side_effect=Stay22ServiceError("Stay22 returned HTTP 503")):
        resp = client.get("/accommodations", params={
            "address": "New York City",
            "checkin": "2026-09-01",
            "checkout": "2026-09-04",
        })
    assert resp.status_code == 200
    assert resp.json()["available"] is False
    assert resp.json()["accommodations"] == []


# ─── 7. Invalid provider response ─────────────────────────────────────────────

def test_normalize_raises_on_non_list_results():
    with pytest.raises(Stay22ServiceError, match="invalid response"):
        _normalize({"meta": {}, "results": "not-a-list"})


def test_search_accommodations_json_decode_error():
    import requests as req_lib

    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.side_effect = ValueError("invalid JSON")

    with patch("services.stay22.requests.get", return_value=mock_resp):
        with pytest.raises(Stay22ServiceError, match="invalid response"):
            search_accommodations(
                address="New York City",
                checkin="2026-09-01",
                checkout="2026-09-04",
            )


# ─── 8. Empty accommodation result ────────────────────────────────────────────

def test_normalize_empty_results():
    result = _normalize(EMPTY_RAW_RESPONSE)
    assert result["available"] is True
    assert result["total"] == 0
    assert result["accommodations"] == []


def test_api_endpoint_returns_empty_accommodations_list(client):
    with patch.object(accommodations_router, "search_accommodations", return_value={
        "available": True,
        "total": 0,
        "nights": 3,
        "currency": "USD",
        "accommodations": [],
    }):
        resp = client.get("/accommodations", params={
            "address": "Uninhabited Island",
            "checkin": "2026-09-01",
            "checkout": "2026-09-04",
        })
    assert resp.status_code == 200
    body = resp.json()
    assert body["available"] is True
    assert body["accommodations"] == []


# ─── 9. Successful normalized response ────────────────────────────────────────

def test_normalize_picks_lowest_price_across_suppliers():
    result = _normalize(VALID_RAW_RESPONSE)
    # First stay: booking=$450, expedia=$420 → best is $420
    first = result["accommodations"][0]
    assert first["price_total"] == 420.0
    assert first["price_per_night"] == 140.0  # 420 / 3 nights


def test_normalize_handles_supplier_outage_gracefully():
    result = _normalize(VALID_RAW_RESPONSE)
    # Second stay: vrbo=$600, booking=null (outage) → best is $600
    second = result["accommodations"][1]
    assert second["price_total"] == 600.0


def test_normalize_includes_booking_links():
    result = _normalize(VALID_RAW_RESPONSE)
    links = result["accommodations"][0]["booking_links"]
    assert any(l["supplier"] == "booking" for l in links)
    assert any(l["supplier"] == "expedia" for l in links)


def test_normalize_includes_location_and_rating():
    result = _normalize(VALID_RAW_RESPONSE)
    first = result["accommodations"][0]
    assert first["lat"] == 40.7128
    assert first["lng"] == -74.0060
    assert first["rating"] == 8.7
    assert first["distance_m"] == 500


def test_normalize_stay_with_no_prices():
    raw = {
        "meta": {"currency": "USD", "nights": 2},
        "results": [{
            "id": "x",
            "name": "No-Price Hotel",
            "type": "Hotel",
            "url": "https://example.com",
            "location": {},
            "rating": {},
            "suppliers": {
                "booking": {"id": "b1", "link": "https://example.com/book"},
                # no price field
            },
        }],
    }
    result = _normalize(raw)
    stay = result["accommodations"][0]
    assert stay["price_total"] is None
    assert stay["price_per_night"] is None


# ─── 10. Existing auth and weather tests still pass (smoke) ───────────────────

def test_health_check_still_works(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "GroupGo API running"


def test_weather_endpoint_still_wired(client, monkeypatch):
    from services.weather import WeatherServiceError
    monkeypatch.setattr(weather_router, "fetch_weather", lambda *a: {
        "location": {}, "hourly": [], "daily": [], "stale": False
    })
    resp = client.get("/weather", params={
        "latitude": 40.71,
        "longitude": -74.01,
        "start_date": "2026-09-01",
        "end_date": "2026-09-03",
    })
    assert resp.status_code == 200


# ─── Helper unit tests ────────────────────────────────────────────────────────

def test_best_price_returns_none_when_all_null():
    result = _best_price({"booking": {"price": None}, "vrbo": {"price": None}}, nights=3)
    assert result["total"] is None
    assert result["per_night"] is None


def test_best_price_skips_non_dict_supplier_entries():
    result = _best_price({"booking": None, "vrbo": {"price": {"total": 300}}}, nights=3)
    assert result["total"] == 300.0


def test_booking_links_excludes_empty_links():
    links = _booking_links({
        "booking": {"id": "b1", "link": "https://example.com"},
        "expedia": {"id": "e1", "link": ""},
        "vrbo": None,
    })
    assert len(links) == 1
    assert links[0]["supplier"] == "booking"


def test_unavailable_response_shape():
    resp = unavailable_response()
    assert resp["available"] is False
    assert resp["accommodations"] == []
    assert resp["total"] == 0
