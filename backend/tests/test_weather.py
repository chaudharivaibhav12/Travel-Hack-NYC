from datetime import date
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import main
from api.routers import weather as weather_router
from services.weather import WeatherServiceError, fetch_weather


class FakeVariable:
    def __init__(self, values):
        self.values = values

    def ValuesAsNumpy(self):
        return self.values

    def ValuesInt64AsNumpy(self):
        return self.values


class FakeSeries:
    def __init__(self, start, end, interval, variables):
        self.start = start
        self.end = end
        self.interval = interval
        self.variables = [FakeVariable(values) for values in variables]

    def Time(self):
        return self.start

    def TimeEnd(self):
        return self.end

    def Interval(self):
        return self.interval

    def Variables(self, index):
        return self.variables[index]


class FakeResponse:
    def Latitude(self):
        return 52.52

    def Longitude(self):
        return 13.41

    def Elevation(self):
        return 38.0

    def UtcOffsetSeconds(self):
        return 7200

    def Hourly(self):
        return FakeSeries(
            1_700_000_000,
            1_700_007_200,
            3_600,
            [[12.5, 13.0], [75, 70], [20, 10], [0.1, 0.0]],
        )

    def Daily(self):
        return FakeSeries(
            1_700_000_000,
            1_700_086_400,
            86_400,
            [[18.0], [8.0], [1_700_020_000], [1_700_055_000]],
        )


@pytest.fixture
def client():
    return TestClient(main.app, raise_server_exceptions=False)


def test_fetch_weather_serializes_openmeteo_response():
    weather_client = MagicMock()
    weather_client.weather_api.return_value = [FakeResponse()]

    forecast = fetch_weather(
        52.52,
        13.41,
        date(2026, 8, 9),
        date(2026, 8, 9),
        client=weather_client,
    )

    assert forecast["location"]["latitude"] == 52.52
    assert forecast["hourly"][0]["temperature_2m"] == 12.5
    assert forecast["hourly"][1]["precipitation_probability"] == 10.0
    assert forecast["daily"][0]["temperature_2m_max"] == 18.0
    assert forecast["daily"][0]["sunrise"].endswith("+00:00")
    assert forecast["stale"] is False
    weather_client.weather_api.assert_called_once()


def test_fetch_weather_wraps_client_errors():
    weather_client = MagicMock()
    weather_client.weather_api.side_effect = RuntimeError("network unavailable")

    with pytest.raises(WeatherServiceError, match="Open-Meteo request failed"):
        fetch_weather(
            52.52,
            13.41,
            date(2026, 8, 9),
            date(2026, 8, 10),
            client=weather_client,
        )


def test_weather_endpoint_returns_forecast(client, monkeypatch):
    expected = {
        "location": {"latitude": 52.52, "longitude": 13.41},
        "hourly": [],
        "daily": [],
        "stale": False,
    }
    monkeypatch.setattr(weather_router, "fetch_weather", lambda *args: expected)

    response = client.get(
        "/weather",
        params={
            "latitude": 52.52,
            "longitude": 13.41,
            "start_date": "2026-08-09",
            "end_date": "2026-08-12",
        },
    )

    assert response.status_code == 200
    assert response.json() == expected


def test_weather_endpoint_rejects_invalid_date_range(client):
    response = client.get(
        "/weather",
        params={
            "latitude": 52.52,
            "longitude": 13.41,
            "start_date": "2026-08-12",
            "end_date": "2026-08-09",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "end_date must be on or after start_date"


def test_weather_endpoint_rejects_invalid_coordinates(client):
    response = client.get(
        "/weather",
        params={
            "latitude": 120,
            "longitude": 13.41,
            "start_date": "2026-08-09",
            "end_date": "2026-08-10",
        },
    )

    assert response.status_code == 422


def test_weather_endpoint_returns_503_when_provider_fails(client, monkeypatch):
    def fail(*args):
        raise WeatherServiceError("Open-Meteo request failed")

    monkeypatch.setattr(weather_router, "fetch_weather", fail)

    response = client.get(
        "/weather",
        params={
            "latitude": 52.52,
            "longitude": 13.41,
            "start_date": "2026-08-09",
            "end_date": "2026-08-10",
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Open-Meteo request failed"
