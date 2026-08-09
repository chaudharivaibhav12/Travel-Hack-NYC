import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side proxy to FastAPI's POST /trips.
 *
 * Same rationale as app/api/weather/route.ts: MasterPrompt §2.9 keeps service
 * URLs server-side. This is also the one place that turns the Plan screen's
 * free-text destination into lat/lng — FastAPI's /trips requires coordinates,
 * but asking someone to type them would be absurd, so this route geocodes via
 * Open-Meteo (same provider the weather feature already trusts, no API key).
 */

const API_BASE = process.env.API_BASE ?? "http://127.0.0.1:8000";
const TIMEOUT_MS = 6000;
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface CreateTripBody {
  event_name?: unknown;
  event_location?: unknown;
  checkin?: unknown;
  checkout?: unknown;
  user_id?: unknown;
}

const REQUIRED_FIELDS = [
  "event_name",
  "event_location",
  "checkin",
  "checkout",
  "user_id",
] as const;

async function geocode(place: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("name", place);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      results?: { latitude: number; longitude: number }[];
    };
    const first = data.results?.[0];
    return first ? { lat: first.latitude, lng: first.longitude } : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as CreateTripBody | null;

  const missing = REQUIRED_FIELDS.filter(
    (key) => !body || typeof body[key] !== "string" || body[key] === "",
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required field: ${missing[0]}` },
      { status: 400 },
    );
  }

  // Safe: every field above passed the string check.
  const { event_name, event_location, checkin, checkout, user_id } = body as Record<
    (typeof REQUIRED_FIELDS)[number],
    string
  >;

  const location = await geocode(event_location);
  if (!location) {
    return NextResponse.json(
      { error: `Couldn't find "${event_location}". Try a city and country.` },
      { status: 422 },
    );
  }

  try {
    const upstream = await fetch(`${API_BASE}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        event_name,
        event_location,
        lat: location.lat,
        lng: location.lng,
        checkin,
        checkout,
        user_id,
      }),
    });

    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: payload?.detail ?? "Couldn't create that trip." },
        { status: upstream.status === 422 ? 422 : 502 },
      );
    }

    return NextResponse.json(payload);
  } catch {
    // Timeout or the service is down. §12: never break the screen.
    return NextResponse.json(
      { error: "Trip service did not respond." },
      { status: 503 },
    );
  }
}
