from datetime import date, datetime, timezone
from functools import lru_cache

import openmeteo_requests
import requests_cache
from retry_requests import retry


FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
DAILY_VARIABLES = (
    "temperature_2m_max",
    "temperature_2m_min",
    "sunrise",
    "sunset",
)
HOURLY_VARIABLES = (
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation_probability",
    "precipitation",
)


class WeatherServiceError(RuntimeError):
    """Raised when Open-Meteo cannot return a usable forecast."""


@lru_cache(maxsize=1)
def get_weather_client() -> openmeteo_requests.Client:
    cache_session = requests_cache.CachedSession(backend="memory", expire_after=3600)
    retry_session = retry(cache_session, retries=3, backoff_factor=0.2)
    return openmeteo_requests.Client(session=retry_session)


def fetch_weather(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
    client: openmeteo_requests.Client | None = None,
) -> dict:
    weather_client = client or get_weather_client()
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": list(DAILY_VARIABLES),
        "hourly": list(HOURLY_VARIABLES),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "timezone": "auto",
    }

    try:
        responses = weather_client.weather_api(FORECAST_URL, params=params)
        if not responses:
            raise WeatherServiceError("Open-Meteo returned no forecast")
        return _serialize_response(responses[0])
    except WeatherServiceError:
        raise
    except Exception as error:
        raise WeatherServiceError("Open-Meteo request failed") from error


def _serialize_response(response) -> dict:
    hourly = response.Hourly()
    daily = response.Daily()

    hourly_values = [hourly.Variables(index).ValuesAsNumpy() for index in range(len(HOURLY_VARIABLES))]
    daily_values = [
        daily.Variables(0).ValuesAsNumpy(),
        daily.Variables(1).ValuesAsNumpy(),
        daily.Variables(2).ValuesInt64AsNumpy(),
        daily.Variables(3).ValuesInt64AsNumpy(),
    ]

    hourly_rows = []
    for index, timestamp in enumerate(_timestamps(hourly.Time(), hourly.TimeEnd(), hourly.Interval())):
        hourly_rows.append({
            "time": timestamp,
            **{
                variable: _number(values[index])
                for variable, values in zip(HOURLY_VARIABLES, hourly_values, strict=True)
            },
        })

    daily_rows = []
    for index, timestamp in enumerate(_timestamps(daily.Time(), daily.TimeEnd(), daily.Interval())):
        daily_rows.append({
            "date": timestamp[:10],
            "temperature_2m_max": _number(daily_values[0][index]),
            "temperature_2m_min": _number(daily_values[1][index]),
            "sunrise": _iso_timestamp(daily_values[2][index]),
            "sunset": _iso_timestamp(daily_values[3][index]),
        })

    return {
        "location": {
            "latitude": response.Latitude(),
            "longitude": response.Longitude(),
            "elevation_m": response.Elevation(),
            "utc_offset_seconds": response.UtcOffsetSeconds(),
        },
        "hourly": hourly_rows,
        "daily": daily_rows,
        "stale": False,
    }


def _timestamps(start: int, end: int, interval: int) -> list[str]:
    return [
        datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
        for timestamp in range(start, end, interval)
    ]


def _iso_timestamp(timestamp: int) -> str:
    return datetime.fromtimestamp(int(timestamp), tz=timezone.utc).isoformat()


def _number(value) -> float | None:
    numeric_value = float(value)
    return None if numeric_value != numeric_value else numeric_value
