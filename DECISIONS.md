# Engineering Decisions

Read this file with `docs/MasterPrompt.md` and `docs/DESIGN.md` before changing
the application. Add concise entries for decisions that affect future work.

## 2026-08-09 — Google OAuth must not silently impersonate success

**Context:** The login UI previously fell back to the seeded demo user when
Supabase configuration was missing or Google OAuth failed. Teammates could not
tell whether they completed real Google authentication.

**Decision:** Google sign-in now returns a visible configuration/provider error.
The explicit `admin` / `admin123` password remains the reliable demo fallback.

**Why:** A button labeled “Continue with Google” must either start real OAuth or
explain why it cannot. Silent substitution hides broken localhost and deployment
configuration and makes authentication impossible to test honestly.

**Alternatives:** Keeping the silent fallback was rejected. Adding a separate
`/demo` button remains an option if judges need a clearer one-click fallback.

**Consequences:** Every developer must create `.env.local`, restart Next.js, and
use a redirect URL allowed by Supabase. OAuth callback errors are displayed on
the login form.

**Validation:** Run `npm run build`, `npm run lint`, and complete one Google
round trip from a teammate's localhost account.

## 2026-08-09 — Email signup uses Supabase confirmation

**Context:** The login form could authenticate existing email/password users but
offered no way to create one. The hosted Supabase project allows signup and has
email autoconfirm disabled.

**Decision:** Add `signUpWithPassword` to the shared auth provider and reuse the
login card as a sign-in/create-account toggle. A signup without a returned
session shows “check your email”; a signup with a session signs in immediately.

**Why:** This models both Supabase confirmation configurations correctly and
keeps pages independent of provider-specific response shapes.

**Alternatives:** A separate registration page was rejected because it would
duplicate the small auth surface. Disabling confirmation was rejected because
verified addresses are safer and match the current project configuration.

**Consequences:** `http://localhost:3000/login` and the deployed `/login` URL
must remain in Supabase's redirect allowlist. Supabase's default mail service is
appropriate for testing but should be replaced with custom SMTP for production.

**Validation:** `npm test`, `npm run lint`, `npm run build`, and a manual signup
using a fresh email followed by its confirmation link.

## 2026-08-09 — Integrate PlanTrip without removing demo resilience

**Context:** `origin/PlanTrip` added real trip creation, geocoding, Supabase
persistence, trip listing, and trip details. It diverged before Stay22, email
signup, and profile work landed on `main`.

**Decision:** Merge PlanTrip while keeping `backend/.env.example`, standardize
all FastAPI calls on port `8001`, derive `created_by` from the server-readable
session cookie rather than a request body field, and retain the seeded itinerary
as a visible demo preview. The explicit demo user receives the seeded trip
instead of attempting an invalid UUID insert.

**Why:** Real users should create and retrieve Supabase trips, while the
`admin` / `admin123` recovery path must remain functional if external services
fail. A single backend port prevents weather and trips from requiring two local
FastAPI processes.

**Alternatives:** Deleting the itinerary preview was rejected because no
itinerary generator exists yet. Trusting a browser-provided `user_id` was
rejected because the server already has an authenticated UI session.

**Consequences:** The `sage_session` cookie remains demo-grade and unsigned; a
production version must verify a Supabase access token server-side. Real trip
creation requires FastAPI on port `8001` and the Supabase `trips` table.

**Validation:** Frontend route tests cover authentication, field validation,
geocoding failure, FastAPI outage, and server-derived ownership. Backend tests
cover date validation, inserts, listing, and provider failures. Run the complete
frontend and backend suites plus a production build before merging.

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

## 2026-08-09 — Modular FastAPI application foundation

**Decision:** Split the backend into domain routers under `backend/api/routers`
and keep `backend/main.py` as an application factory and router registry.

**Why:** Weather, accommodations, auth, trips, members, and future Claude agents
can now evolve independently while sharing middleware and dependencies. Existing
endpoint URLs remain unchanged, so the frontend does not require a migration.

**Testing:** Supabase is injected with FastAPI dependency overrides. External
providers remain mocked at the router boundary, preserving offline tests and
making future agent/provider modules testable without consuming API credits.

## 2026-08-09 — Group-trip workflow integration

**Decision:** Integrate the `shwetanshu-group` workflow as a separate
`/group-trips` router and dedicated frontend domain under `lib/group`.

**Why:** The feature adds invitations, private surveys, generated itinerary
contexts, and per-member plans without replacing the existing single-person
`/trips` flow. Provider and Supabase dependencies remain shared through the
modular FastAPI foundation.

**Database:** `supabase_migration.sql` is retained for review and manual
application. It is not applied automatically; its development-only disabled
RLS settings must be replaced with authenticated policies before production.

## 2026-08-09 — MyTrip preference workflow integration

**Decision:** Merge the `MyTrip` frontend while moving its backend additions
into dedicated `preferences` and `plans` FastAPI routers. Extend the existing
trip router only for creator auto-membership.

**Why:** This preserves the modular backend and group-trip workflow while
adding category-based travel, stay, food, and activity preferences plus a
deterministic single-trip plan. Existing endpoint URLs remain compatible.

**Database:** The preference SQL files are included but not automatically
applied. Their development-only disabled RLS state requires secure policies
before production deployment.

## 2026-08-09 — Private itinerary generation

**Decision:** Add an explicit `POST /trips/{trip_id}/itinerary` workflow backed
by Claude, rather than generating during the existing read-only plan request.

**Why:** `GET /trips/{trip_id}/plan` remains deterministic and safe to refresh.
Generation happens only after all four preference categories are complete.
Claude receives structured trip, preference, and Stay22 data and must return a
validated JSON itinerary; it cannot invent live prices, availability, or links.

**Resilience:** Provider errors use a deterministic preference-based fallback.
Saving to `trip_itineraries` is best-effort so generation remains demoable until
`backend/sql/004_trip_itineraries.sql` is applied.

**Testing:** Claude is mocked at the router boundary. Tests never consume API
credits, and separately cover incomplete preferences and fallback date coverage.

## 2026-08-09 — Cross-machine group plan generation

**Decision:** Keep the deterministic group planning engine, but feed it completed
surveys from FastAPI instead of browser `localStorage`. Persist the resulting plan
set for every member and hydrate it when the plans screen opens.

**Why:** Local-only generation excluded teammates who completed surveys on other
machines. Reusing the existing engine avoids a risky rewrite while making the
create → survey → generate → review handoff collaborative.
