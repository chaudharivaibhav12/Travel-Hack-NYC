import requests
from datetime import date, timedelta

API_KEY = ""
BASE_URL = "https://api.stay22.com/v2/accommodations"
HEADERS = {"X-API-KEY": API_KEY}


def search_hotels(address: str, checkin: str, checkout: str, page_size: int = 5) -> dict:
    params = {
        "address": address,
        "checkin": checkin,
        "checkout": checkout,
        "pageSize": page_size,
    }
    resp = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def print_results(data: dict, checkin: str, checkout: str) -> None:
    meta = data.get("meta", {})
    results = data.get("results", [])

    print(f"\n{'='*60}")
    print(f"  Stay22 Hotel Search Results")
    print(f"{'='*60}")
    print(f"  Dates     : {checkin} → {checkout} ({meta.get('nights', '?')} nights)")
    print(f"  Currency  : {meta.get('currency', 'USD')}")
    print(f"  Total     : {meta.get('total', '?')} properties  |  Page {meta.get('page', 1)}")
    print(f"{'='*60}\n")

    if not results:
        print("  No results found.")
        return

    for i, stay in enumerate(results, 1):
        name = stay.get("name", "Unknown")
        stay_type = stay.get("type", "")
        location = stay.get("location", {})
        address_str = location.get("address", "")
        dist_m = location.get("distanceInMeters")
        rating = stay.get("rating", {})
        score = rating.get("score") if rating else None
        url = stay.get("url", "")

        dist_str = f"{dist_m / 1000:.1f} km" if dist_m is not None else "—"
        score_str = f"{score:.1f}" if score is not None else "—"

        print(f"  [{i}] {name} ({stay_type})")
        print(f"      Address : {address_str}")
        print(f"      Distance: {dist_str}  |  Rating: {score_str}")

        suppliers = stay.get("suppliers", {})
        if suppliers:
            print("      Prices  :")
            for supplier, info in suppliers.items():
                if info is None:
                    continue
                price = info.get("price")
                link = info.get("link", "")
                nights = meta.get("nights", 1) or 1
                if price and isinstance(price, dict):
                    total = price.get("total")
                    per_night = round(total / nights, 2) if total else None
                    price_str = f"${total} total  (${per_night}/night)"
                elif price is None:
                    price_str = "unavailable (supplier outage)"
                else:
                    price_str = "no quote"
                print(f"        • {supplier:<12} {price_str}")
                print(f"          {link}")
        print()


def main():
    # --- Configure your search here ---
    address = "New York City"
    checkin = "2026-09-01"
    checkout = "2026-09-05"
    # ----------------------------------

    print(f"\nSearching hotels in '{address}' from {checkin} to {checkout} ...")

    try:
        data = search_hotels(address, checkin, checkout, page_size=5)
    except requests.HTTPError as e:
        print(f"HTTP error {e.response.status_code}: {e.response.text}")
        return
    except requests.RequestException as e:
        print(f"Request failed: {e}")
        return

    print_results(data, checkin, checkout)

    # Show next-page link if available
    links = data.get("_links", {})
    next_link = links.get("next")
    if next_link:
        href = next_link.get("href") if isinstance(next_link, dict) else next_link
        print(f"  More results → {href}\n")


if __name__ == "__main__":
    main()
