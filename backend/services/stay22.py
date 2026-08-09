"""Stay22 accommodation search service.

Wraps the Stay22 v2/accommodations endpoint and returns a normalized
response the frontend can consume without understanding Stay22's raw schema.

The frontend never calls Stay22 directly; credentials stay server-side.

If Stay22 is unavailable, times out, or returns zero results the caller
receives a controlled empty/unavailable response so the UI can hide the
accommodation panel instead of crashing.
"""
from __future__ import annotations

import os
from datetime import date
from typing import Any

import requests

STAY22_BASE_URL = "https://api.stay22.com/v2/accommodations"
STAY22_TIMEOUT = 15  # seconds


class Stay22ServiceError(RuntimeError):
    """Raised when Stay22 cannot return usable accommodation data."""


def _api_key() -> str:
    return os.getenv("STAY22_API_KEY", "")


def _headers() -> dict[str, str]:
    key = _api_key()
    if key:
        return {"X-API-KEY": key}
    # Demo mode: no header, rate-limited to 5 req/min by Stay22
    return {}


def search_accommodations(
    *,
    address: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    checkin: date | str,
    checkout: date | str,
    guests: int = 1,
    page_size: int = 10,
    min_price: float | None = None,
    max_price: float | None = None,
) -> dict[str, Any]:
    """Search Stay22 and return a normalized response.

    At least one of `address` or (`lat`, `lng`) is required.
    Dates must be today or later, checkout after checkin.

    Returns a dict with:
      - available (bool)
      - total (int)
      - nights (int)
      - currency (str)
      - accommodations (list of normalized stays)
    """
    if address is None and (lat is None or lng is None):
        raise Stay22ServiceError("Either address or lat+lng is required")

    checkin_str = checkin.isoformat() if isinstance(checkin, date) else checkin
    checkout_str = checkout.isoformat() if isinstance(checkout, date) else checkout

    params: dict[str, Any] = {
        "checkin": checkin_str,
        "checkout": checkout_str,
        "pageSize": page_size,
    }
    if address:
        params["address"] = address
    if lat is not None and lng is not None:
        params["lat"] = lat
        params["lng"] = lng
    if min_price is not None:
        params["min"] = min_price
    if max_price is not None:
        params["max"] = max_price

    try:
        resp = requests.get(
            STAY22_BASE_URL,
            headers=_headers(),
            params=params,
            timeout=STAY22_TIMEOUT,
        )
        resp.raise_for_status()
        raw = resp.json()
    except requests.Timeout as exc:
        raise Stay22ServiceError("Stay22 request timed out") from exc
    except requests.HTTPError as exc:
        raise Stay22ServiceError(
            f"Stay22 returned HTTP {exc.response.status_code}"
        ) from exc
    except requests.RequestException as exc:
        raise Stay22ServiceError("Stay22 request failed") from exc
    except Exception as exc:
        raise Stay22ServiceError("Stay22 returned an invalid response") from exc

    return _normalize(raw)


def _normalize(raw: dict[str, Any]) -> dict[str, Any]:
    """Convert Stay22 raw response to the normalized shape the frontend expects."""
    meta = raw.get("meta") or {}
    results = raw.get("results") or []

    if not isinstance(results, list):
        raise Stay22ServiceError("Stay22 returned an invalid response")

    nights = meta.get("nights") or 1
    currency = meta.get("currency", "USD")

    stays = []
    for item in results:
        suppliers_raw = item.get("suppliers") or {}
        best_price = _best_price(suppliers_raw, nights)
        booking_links = _booking_links(suppliers_raw)

        location = item.get("location") or {}
        coords = location.get("coordinates") or {}
        rating = item.get("rating") or {}

        stays.append({
            "id": item.get("id", ""),
            "name": item.get("name", ""),
            "type": item.get("type", ""),
            "url": item.get("url", ""),
            "address": location.get("address", ""),
            "lat": coords.get("lat"),
            "lng": coords.get("lng"),
            "distance_m": location.get("distanceInMeters"),
            "rating": rating.get("score"),
            "price_total": best_price["total"],
            "price_per_night": best_price["per_night"],
            "currency": currency,
            "booking_links": booking_links,
        })

    return {
        "available": True,
        "total": meta.get("total", len(stays)),
        "nights": nights,
        "currency": currency,
        "accommodations": stays,
    }


def _best_price(suppliers: dict, nights: int) -> dict[str, float | None]:
    """Return the lowest total price across all suppliers, or None if no quote."""
    best_total: float | None = None
    for supplier_data in suppliers.values():
        if not isinstance(supplier_data, dict):
            continue
        price = supplier_data.get("price")
        if isinstance(price, dict):
            total = price.get("total")
            if isinstance(total, (int, float)) and (best_total is None or total < best_total):
                best_total = float(total)

    per_night: float | None = None
    if best_total is not None and nights > 0:
        per_night = round(best_total / nights, 2)

    return {"total": best_total, "per_night": per_night}


def _booking_links(suppliers: dict) -> list[dict[str, str]]:
    """Return a list of {supplier, link} for each supplier that has a booking URL."""
    links = []
    for name, data in suppliers.items():
        if not isinstance(data, dict):
            continue
        link = data.get("link", "")
        if link:
            links.append({"supplier": name, "link": link})
    return links


def unavailable_response() -> dict[str, Any]:
    """Return the controlled empty response the frontend renders when Stay22 is down."""
    return {
        "available": False,
        "total": 0,
        "nights": 0,
        "currency": "USD",
        "accommodations": [],
    }
