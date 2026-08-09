# Overview (/docs/api)



Starting with accommodations, receive commissions in USD anytime a reservation is made in any of the brands' platforms via Stay22.
Get started by [Creating a new API token](https://hub.stay22.com/en/settings/api) in your Hub.

## Endpoints [#endpoints]

* **[Accommodations](/docs/api/accommodations/search)** — the current unified search: one stay per property with a `suppliers` map across Booking.com, VRBO, Expedia, and Hotels.com, returned in a single request. Build your own travel UI and earn commissions on every booking tracked to your `aid`.
* **[Reporting](/docs/api/reporting/transactions)** — retrieve partner transaction data.

## Try it now [#try-it-now]

<TryItNow url="/v2/accommodations?address=Paris" />

No key needed for demo mode (5 req/min). Open [Search Accommodation](/docs/api/accommodations/search) for the full parameter list and a live playground.

## Usage restrictions [#usage-restrictions]

The Direct Travel API serves live pricing and availability for consumer apps, MCP servers, and similar integrations. You may **not** hard- or cold-store listings in your own database, and you may **not** use it for data analysis. It is intentionally RESTful, with limited information per listing, for instant consumption by your end users.

<Callout type="info">
  Not sure you need the API? Start with [Allez](/docs/allez) or [Maps](/docs/maps) — a hosted link or widget covers most use cases without a backend.
</Callout>


# Quickstart (/docs/api/quickstart)





This guide makes one working request to the Direct Travel API — a live search for hotels in Paris — and reads the response. Swap in any address or coordinates once it works.

## Prerequisites [#prerequisites]

* **API token** (optional to start) — create one in the [Hub](https://hub.stay22.com/en/settings/api). You can skip it and use demo mode (5 req/min) for the first call.

<Steps>
  <Step>
    ## Make a request [#make-a-request]

    To search, call `GET /v2/accommodations` with a location and your key in the `X-API-KEY` header. `provider` is optional — omit it to search all suppliers at once.

    ```bash
    curl -H "X-API-KEY: <API_KEY>" \
      "https://api.stay22.com/v2/accommodations?address=Paris"
    # get <API_KEY> at hub.stay22.com — or omit the header for demo mode
    ```
  </Step>

  <Step>
    ## Read the response [#read-the-response]

    Each stay arrives in `results[]`. Every stay carries a top-level `url` (a Stay22 deeplink that already carries your `aid`) and a `suppliers` map keyed by supplier. Without dates the search is **static** — no prices yet.

    ```json
    {
      "meta": { "page": 1, "pageSize": 10, "total": 29758, "hasMore": true, "currency": "USD" },
      "results": [
        {
          "id": "42f1014f...0000",
          "name": "Appartement aux portes de Paris",
          "type": "Apartment",
          "url": "https://www.stay22.com/allez/roam/...?aid=<AID>",
          "suppliers": {
            "booking": { "id": "15711178", "link": "https://www.stay22.com/allez/booking/15711178?aid=<AID>" }
          }
        }
      ],
      "_links": { "next": { "href": "https://api.stay22.com/v2/accommodations?address=Paris&page=2" } }
    }
    ```

    Each `suppliers.<name>` entry has that supplier's `id`, a booking `link`, and (with dates) a `price`. Follow `_links.next` to page through results. See [Response & supplier model](/docs/api/concepts/response-model).
  </Step>

  <Step>
    ## Add dates for live prices [#add-dates-for-live-prices]

    Without dates, the search returns **static** results (no prices). Pass `checkin`/`checkout` to get a per-supplier `price` for each stay:

    ```bash
    curl -H "X-API-KEY: <API_KEY>" \
      "https://api.stay22.com/v2/accommodations?address=Paris&checkin=2026-07-01&checkout=2026-07-04"
    ```

    Each supplier now carries a `price.total` (full-stay total in `meta.currency`), and `meta` echoes your window:

    ```json
    {
      "meta": { "page": 1, "pageSize": 10, "total": 18342, "hasMore": true, "currency": "USD", "nights": 3 },
      "results": [
        { "suppliers": { "booking": { "price": { "total": 252 } } } }
      ]
    }
    ```

    See [Pricing & quotes](/docs/api/concepts/pricing).
  </Step>
</Steps>

## What to read next [#what-to-read-next]

* [Search Accommodation](/docs/api/accommodations/search) — every parameter, with a live playground
* [Concepts](/docs/api/concepts) — locations, pricing, caching, pagination, and clustering
* [Code Examples](/docs/api/recipes/code-examples) — JavaScript, Python, and cURL

# Authentication (/docs/api/authentication)



The Direct Travel API authenticates each request with an API key passed in the `X-API-KEY` header. No key is needed for demo mode, which is rate-limited to 5 requests per minute.

## Get an API key [#get-an-api-key]

1. Sign up or log in at [hub.stay22.com](https://hub.stay22.com/).
2. Go to [Settings → API](https://hub.stay22.com/en/settings/api), enter a token name, and click **Create**.

## Use your API key [#use-your-api-key]

Pass the key in the `X-API-KEY` header (recommended):

```bash
curl -H "X-API-KEY: <API_KEY>" \
  "https://api.stay22.com/v2/accommodations?address=Paris"
# get <API_KEY> at hub.stay22.com
```

Or as the `key` query parameter:

```bash
curl "https://api.stay22.com/v2/accommodations?key=<API_KEY>&address=Paris"
```

## Demo mode [#demo-mode]

Omit the key to try the API without an account. Demo mode is limited to **5 requests per minute** per IP; an API key raises this to 100. See [Rate Limits](/docs/api/rate-limits).

```bash
curl "https://api.stay22.com/v2/accommodations?address=Paris"
```

## Invalid or missing key [#invalid-or-missing-key]

A missing or invalid key returns `401`:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "code": "INVALID_API_KEY",
  "message": "Invalid API key. Get your API key at hub.stay22.com",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

For the full list of error codes, see the [API Reference](/docs/api) — error responses are documented under each endpoint.


RATE LIMIT = Standard	150 req/min	By API key	With valid API key

# Locations & geocoding (/docs/api/concepts/locations)



Every search needs a location, supplied as one of four inputs. Provide at least one, or the request fails with `LOCATION_REQUIRED`.

| Input        | Parameters                         | When to use                                                        | Notes                                                   |
| ------------ | ---------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Address      | `address`                          | A city, region, or place name you have as text                     | Geocoded server-side; less precise than coordinates     |
| Coordinates  | `lat` + `lng` (+ `radius`)         | You already have a point and want the most precise, fastest search | Skips geocoding                                         |
| Bounding box | `nelat`, `nelng`, `swlat`, `swlng` | Map UIs searching the visible viewport                             | All four corners are required together                  |
| Hotel IDs    | `hotelids`                         | Looking up specific known stays                                    | Can be Stay22 hotel IDs or Hotel IDs from the providers |

## Points of interest [#points-of-interest]

For a landmark or venue (e.g. "Eiffel Tower", "Bell Centre"), geocode the point of interest to coordinates first, then search with `lat`/`lng` + `radius`. This is faster and more precise than passing the name as `address`.

## Priority [#priority]

When both `address` and `lat`/`lng` are present, coordinates win; the address is used only as a fallback and for display context.

## What to read next [#what-to-read-next]

* [Response & supplier model](/docs/api/concepts/response-model) — the shape of a result
* [Pricing & quotes](/docs/api/concepts/pricing) — add dates to get live prices
* [Search Accommodation](/docs/api/accommodations/search) — every location parameter, with a live playground

# Response & supplier model (/docs/api/concepts/response-model)



Every search returns `results[]`, `meta`, and `_links`. Each `results[]` entry is one unified stay per property, carrying a `suppliers.<name>` map across Booking.com, VRBO, Expedia, and Hotels.com.

## The stay [#the-stay]

Each stay holds the property-level fields:

* `id`, `name`, `type`
* `location` (`address`, `coordinates`, `distanceInMeters`), `rating`, `capacity`, `policies`, `media`
* `url` — a Stay22 deeplink carrying your `aid`, so the booking is tracked to you

`meta` carries `currency`, `page`, `pageSize`, `total`, and `hasMore` (plus `checkin`, `checkout`, and `nights` for dated searches); `_links.self` is the canonical URL for the request and `_links.next` pages forward. See [Pagination](/docs/api/concepts/pagination).

## Suppliers [#suppliers]

The `suppliers.<name>` map (e.g. `booking`, `vrbo`, `expedia`, `hotelscom`) holds, per supplier:

* `id` and `link` — a Stay22 deeplink to that supplier, carrying your `aid`
* `price` — `price.total` is the full-stay amount in `meta.currency` (divide by `meta.nights` for per-night). Per supplier, three states, never `0`: a `{ total }` object when quoted; `null` when that supplier couldn't be reached (availability unknown, not sold out); omitted when the search ran without dates or the supplier returned no quote. States can mix across suppliers on one stay. See [Pricing & quotes](/docs/api/concepts/pricing)

The `provider` filter is optional: omit it to return all suppliers, or pass `provider=booking|vrbo|expedia|hotelscom` to narrow the results to one.

<Callout type="info">
  In clustered responses, sparse stays flow through `results[]` and dense areas through `clusters[]`; a stay never appears in both. See [Clustering](/docs/api/concepts/clustering).
</Callout>

## What to read next [#what-to-read-next]

* [Pagination](/docs/api/concepts/pagination) — page through results
* [Clustering](/docs/api/concepts/clustering) — H3 markers for dense viewports
* [Pricing & quotes](/docs/api/concepts/pricing) — when prices appear

# Pricing & quotes (/docs/api/concepts/pricing)



Price quotes appear only when you search with dates. Omit `checkin`/`checkout` and results are static — no quotes, and the price filters are no-ops.

## Where prices live [#where-prices-live]

Per-supplier quotes live under `suppliers.<name>.price`, with `total` for the full stay in the response currency. Divide by `meta.nights` for the per-night price.

Set the response currency with `currency`.

## Reading `suppliers.<name>.price` [#reading-suppliersnameprice]

The field is per supplier and has three states — the price is never returned as `0`:

| `price`            | Meaning                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ "total": 420 }` | The supplier returned a live quote.                                                                                                           |
| `null`             | We tried to quote this supplier but couldn't reach it — availability is **unknown**, not sold out. Don't treat `null` as free or unavailable. |
| *omitted*          | Pricing didn't run (no dates), or the supplier returned no quote on a healthy priced request.                                                 |

Because the states are per supplier, one stay can mix them: during a partial outage `suppliers.booking.price` may be a quote while `suppliers.expedia.price` is `null` on the same result. An omitted field across all suppliers with no dates just means you didn't search with dates.

## Price filters [#price-filters]

The `min` and `max` filters apply to the **per-night price in USD** and only run when `checkin`/`checkout` are also supplied.

## Date rules [#date-rules]

Explicit dates must be today or later and no more than two years in the future. Omitting dates yields static results.

<Callout type="info">
  Searching without dates is the fastest path when you only need availability and listings, not live prices.
</Callout>

## What to read next [#what-to-read-next]

* [Response & supplier model](/docs/api/concepts/response-model) — where prices live in a result
* [Caching](/docs/api/concepts/caching) — cache priced responses safely
* [Locations & geocoding](/docs/api/concepts/locations) — where to search

# Pagination (/docs/api/concepts/pagination)



The search pages results with `page` (1-indexed) and `pageSize` (≤100); follow `_links.next` until it is absent. `meta.hasMore` is the source of truth for "is there another page?"

## What `meta.total` means [#what-metatotal-means]

`meta.total` is a bounded count of the stays you can page through for this request, and its meaning depends on the request:

| Request                       | `meta.total` is                                    | Caveat                                                   |
| ----------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Static (no dates)             | Stays matching your geo + predicate filters        | Saturates at \~100,000 for very broad viewports          |
| Priced (`checkin`/`checkout`) | Stays that survived availability + price filtering | `total` and `hasMore` stay consistent with `_links.next` |
| `cluster=top`                 | Candidate areas (H3 cells) in the viewport         | A lower bound for very dense viewports                   |

## How to page [#how-to-page]

Follow `_links.next` until it is absent or `meta.hasMore` is `false`. Don't compute page counts from `meta.total` alone — treat `hasMore`/`_links.next` as authoritative.

## What to read next [#what-to-read-next]

* [Clustering](/docs/api/concepts/clustering) — how `cluster=top` changes `meta.total`
* [Response & supplier model](/docs/api/concepts/response-model) — the shape you're paging through
* [Search Accommodation](/docs/api/accommodations/search) — `page`/`pageSize` on the search endpoint

# Clustering (/docs/api/concepts/clustering)



For dense map viewports, the search can summarize stays into hex-grid (H3) markers instead of returning a flat list. Clustering is off by default.

## Modes [#modes]

Set the `cluster` parameter:

| `cluster`            | Behavior                                                                                                                                                                                                                      | Use case                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `false` (or omitted) | Flat list of stays                                                                                                                                                                                                            | Default; lists and simple grids             |
| `auto`               | Server clusters dense viewports into H3 markers when it judges clustering useful                                                                                                                                              | Map UIs that want automatic behavior        |
| `true`               | Forces H3 clustering whenever geometrically possible; on tight viewports clamps to the deepest resolution (r8, \~460 m hexes)                                                                                                 | Map UIs that always want markers            |
| `top`                | Returns ONE representative stay (the best-rated) per H3 cell in `results[]` (each tagged with `cellId`), paginated over cells. Unlike `auto`/`true`, it keeps clustering at tight zoom instead of falling back to a flat list | A lightweight "top stays per area" overview |

`precision` optionally overrides the H3 cell size for `cluster=top`; it is ignored (not validated) for other modes. Range `4` (\~22 km hexes) to `8` (\~460 m hexes). When omitted, the server derives a sensible resolution from the viewport (one step coarser than count-clustering); an explicit value also forces top mode on tight viewports that would otherwise return a flat list. `meta.clustering.mode` reports which mode ran (for example, `top` for a `cluster=top` request).

## Clustered responses [#clustered-responses]

`auto`/`true` responses include a separate `clusters[]` array; sparse stays continue to flow through `results[]`, and a stay never appears in both. Each cluster includes `count`, `location.bounds`, `location.coordinates`, and a pre-built `_links.expand` URL for drilling into that cluster's area.

<Callout type="warn">
  Structural blockers — ID lookups, center+radius searches without a bounding box, and requests without a resolvable viewport — always return a flat list even with `cluster=true` or `cluster=top`.
</Callout>

## What to read next [#what-to-read-next]

* [Pagination](/docs/api/concepts/pagination) — paging clustered results and `meta.total`
* [Response & supplier model](/docs/api/concepts/response-model) — `clusters[]` vs `results[]`
* [Search Accommodation](/docs/api/accommodations/search) — the `cluster` and `precision` params

# Code Examples (/docs/api/recipes/code-examples)



Examples for the unified search, which returns one stay per property with a `suppliers` map across Booking.com, VRBO, Expedia, and Hotels.com in a single request.

## Unified search [#unified-search]

```bash
# searches all suppliers at once — no provider required
curl -H "X-API-KEY: <API_KEY>" \
  "https://api.stay22.com/v2/accommodations?address=Paris"
# get <API_KEY> at hub.stay22.com — or omit the header for demo mode
```

Each result carries a `suppliers.<name>` map; `suppliers.<name>.link` is a Stay22 deeplink that carries your `aid`:

```json
{
  "meta": { "page": 1, "pageSize": 10, "total": 29758, "hasMore": true, "currency": "USD" },
  "results": [
    {
      "id": "42f1014f...0000",
      "url": "https://www.stay22.com/allez/roam/...?aid=<AID>",
      "name": "Appartement aux portes de Paris",
      "suppliers": {
        "booking": { "id": "15711178", "link": "https://www.stay22.com/allez/booking/15711178?aid=<AID>" }
      }
    }
  ],
  "_links": { "next": "https://api.stay22.com/v2/accommodations?address=Paris&page=2" }
}
```

See [Response & supplier model](/docs/api/concepts/response-model).

## Paginate [#paginate]

To page through results, follow `_links.next` until it is absent (see [Pagination](/docs/api/concepts/pagination)).

```javascript
async function* allStays(params) {
  let url = `https://api.stay22.com/v2/accommodations?${new URLSearchParams(params)}`;
  while (url) {
    const res = await fetch(url, { headers: { 'X-API-KEY': process.env.API22_API_KEY } });
    const { results, _links } = await res.json();
    yield* results;
    url = _links.next ?? null;
  }
}
```

## Filter by supplier [#filter-by-supplier]

```bash
curl -H "X-API-KEY: <API_KEY>" \
  "https://api.stay22.com/v2/accommodations?address=Paris&provider=booking"
```

## Add dates for live prices [#add-dates-for-live-prices]

With `checkin`/`checkout`, each supplier gains a `price` (see [Pricing & quotes](/docs/api/concepts/pricing)):

```python
import requests, os

res = requests.get(
    'https://api.stay22.com/v2/accommodations',
    headers={'X-API-KEY': os.getenv('API22_API_KEY')},
    params={'address': 'New York City', 'checkin': '2026-07-01', 'checkout': '2026-07-04'},
)
data = res.json()
```

## Cluster a dense map viewport [#cluster-a-dense-map-viewport]

```bash
curl -H "X-API-KEY: <API_KEY>" \
  "https://api.stay22.com/v2/accommodations?nelat=48.90&nelng=2.42&swlat=48.80&swlng=2.25&cluster=auto"
```

See [Clustering](/docs/api/concepts/clustering).

# Search Accommodation (/docs/api/accommodations/search)



{/* This file was generated by Fumadocs. Do not edit this file directly. Any changes should be made by running the generation command again. */}

