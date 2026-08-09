"""Live smoke check for the Stay22 accommodation service.

Reads STAY22_API_KEY from the environment (or runs in demo mode without one).
Exits 0 on success, 1 on failure. Does not print or store credentials.

Usage:
    python scripts/check_stay22.py
    STAY22_API_KEY=<your-key> python scripts/check_stay22.py
"""
from __future__ import annotations

import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.stay22 import Stay22ServiceError, search_accommodations


def main() -> None:
    checkin = date.today() + timedelta(days=30)
    checkout = checkin + timedelta(days=3)

    api_key = os.getenv("STAY22_API_KEY", "")
    mode = "authenticated" if api_key else "demo (no API key, rate-limited)"
    print(f"\nStay22 smoke check — mode: {mode}")
    print(f"  Search: New York City  {checkin} → {checkout}\n")

    try:
        result = search_accommodations(
            address="New York City",
            checkin=checkin,
            checkout=checkout,
            page_size=5,
        )
    except Stay22ServiceError as exc:
        print(f"FAIL  Stay22ServiceError: {exc}")
        sys.exit(1)

    count = len(result["accommodations"])
    print(f"OK    available={result['available']}  total={result['total']}  "
          f"nights={result['nights']}  currency={result['currency']}")
    print(f"      returned {count} accommodation(s) in this page\n")

    for i, stay in enumerate(result["accommodations"], 1):
        price = (
            f"${stay['price_per_night']}/night (${stay['price_total']} total)"
            if stay["price_per_night"] is not None
            else "no price"
        )
        print(f"  [{i}] {stay['name']} ({stay['type']})  rating={stay['rating']}  {price}")

    print("\nStay22 smoke check PASSED")


if __name__ == "__main__":
    main()
