# Architecture Decisions

## Stay22 Integration — feat/stay22-integration

### Decision: reuse `shwetanshu_api_tests` implementation

The `shwetanshu_api_tests` branch contained a working live-search script
(`api_tests/stay22api_test.py`) that proved the Stay22 v2/accommodations
endpoint works for address-based searches with date ranges and produces
usable price data per supplier. Rather than rewrite that logic, the service
function (`search_accommodations`) reuses the same HTTP call pattern and
response traversal, lifted into a proper FastAPI service layer.

The original script was not imported; it was a standalone CLI. Only the
API call pattern and field-extraction logic were reused. No code was
cherry-picked via `git cherry-pick` because the branch contained only the
script and documentation — copying the relevant logic directly was cleaner.

### Decision: isolate Stay22 behind `backend/services/stay22.py`

Stay22 is an external commercial API with its own auth, rate limits, and
potential outages. Keeping it in its own service module means:

- The frontend never touches Stay22 credentials (key stays server-side).
- The route handler in `main.py` is minimal — validation and error
  delegation only.
- The normalization logic is unit-testable without HTTP or FastAPI.
- Swapping or disabling Stay22 requires touching one file.

### Decision: return a normalized response, not Stay22's raw JSON

Stay22's raw response embeds per-supplier pricing in nested maps, uses
Stay22-specific field names (`distanceInMeters`, supplier keys like
`booking`/`vrbo`), and has three distinct price states (`{total}`, `null`,
omitted). The frontend should not need to understand any of that.

The normalized shape is flat and frontend-friendly:

```json
{
  "available": true,
  "total": 39,
  "nights": 3,
  "currency": "USD",
  "accommodations": [
    {
      "id": "...",
      "name": "Days Inn By Wyndham Brooklyn Marine Park",
      "type": "Hotel",
      "url": "https://www.stay22.com/...",
      "address": "3011 Emmons Avenue, Brooklyn, NY 11235",
      "lat": 40.5869,
      "lng": -73.9431,
      "distance_m": 800,
      "rating": 7.2,
      "price_total": 421.0,
      "price_per_night": 140.33,
      "currency": "USD",
      "booking_links": [
        { "supplier": "booking", "link": "https://www.stay22.com/allez/booking/...?aid=..." }
      ]
    }
  ]
}
```

`price_total` and `price_per_night` reflect the lowest available quote
across all suppliers. `booking_links` lets the frontend offer a "Book on
Booking.com / Expedia" deep-link without knowing which supplier won.

### Decision: timeout and empty-result behavior

If Stay22 times out, returns an HTTP error, returns invalid JSON, or
raises any other exception, the route returns this controlled response
with HTTP 200 instead of propagating a 5xx:

```json
{ "available": false, "total": 0, "nights": 0, "currency": "USD", "accommodations": [] }
```

The frontend checks `available` before rendering the accommodation panel.
If `available` is `false` or `accommodations` is empty, it hides the panel
entirely. This prevents a broken or empty listings panel during a demo.

### What was tested

- 28 unit tests in `backend/tests/test_stay22.py` covering:
  - Valid request → normalized response
  - Required-field validation (address or lat+lng, checkin, checkout)
  - Invalid date range (checkout ≤ checkin)
  - Invalid coordinate bounds
  - Provider timeout
  - Provider HTTP error
  - Invalid/non-JSON provider response
  - Empty result set
  - Normalized price picking (lowest across suppliers)
  - Supplier outage handling (null price)
  - Booking link extraction
  - Regression: health check, weather endpoint still work

- 24 existing tests (`test_main.py`, `test_weather.py`) all still pass.

- Live smoke check (`backend/scripts/check_stay22.py`) in demo mode
  (no API key, Stay22's public tier): returned 39 results for
  "New York City" with real prices.

### Remaining limitations

- **`guests` parameter is not forwarded to Stay22.** The Stay22 v2 API
  does not appear to accept a guest count directly; it is accepted by the
  route for future use and for potential client-side filtering.
- **No API key by default.** Demo mode is limited to 5 req/min per IP.
  Add `STAY22_API_KEY` to `.env` for production use (150 req/min).
- **No frontend wiring.** The `/accommodations` endpoint is implemented
  and tested. A typed API client in the Next.js app and UI states
  (loading / success / empty / unavailable) are the next step.
- **Rating is sometimes null.** The demo API returns `rating: null` for
  some properties. The frontend should handle `rating === null` gracefully.

## API Reference: /accommodations

**Endpoint:** `GET /accommodations`

**Parameters:**

| Name       | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| address    | string | *        | City, region, or place name          |
| lat        | float  | *        | Latitude (-90 to 90)                 |
| lng        | float  | *        | Longitude (-180 to 180)              |
| checkin    | date   | yes      | YYYY-MM-DD, must be before checkout  |
| checkout   | date   | yes      | YYYY-MM-DD, must be after checkin    |
| guests     | int    | no       | Default 1                            |
| page_size  | int    | no       | Default 10, max 100                  |
| min_price  | float  | no       | Minimum per-night price (USD)        |
| max_price  | float  | no       | Maximum per-night price (USD)        |

*Provide either `address` or both `lat` + `lng`.

**Example request:**

```
GET /accommodations?address=New+York+City&checkin=2026-09-01&checkout=2026-09-04
```

**Example response (success):**

```json
{
  "available": true,
  "total": 39,
  "nights": 3,
  "currency": "USD",
  "accommodations": [
    {
      "id": "hotel-abc",
      "name": "Grand Hotel",
      "type": "Hotel",
      "url": "https://www.stay22.com/allez/roam/hotel-abc?aid=stay22",
      "address": "123 Main St, New York, NY",
      "lat": 40.7128,
      "lng": -74.006,
      "distance_m": 500,
      "rating": 8.7,
      "price_total": 420.0,
      "price_per_night": 140.0,
      "currency": "USD",
      "booking_links": [
        { "supplier": "expedia", "link": "https://www.stay22.com/allez/expedia/..." }
      ]
    }
  ]
}
```

**Example response (provider unavailable):**

```json
{ "available": false, "total": 0, "nights": 0, "currency": "USD", "accommodations": [] }
```

**Required environment variable:**

```
STAY22_API_KEY=your-stay22-api-key  # optional; omit for demo mode (5 req/min)
```
