import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side proxy to the FastAPI weather service.
 *
 * Why a route handler rather than calling FastAPI from the browser:
 *  - MasterPrompt §2.9 keeps service URLs server-side; WEATHER_API_BASE never
 *    reaches the client bundle.
 *  - No CORS negotiation, and the backend's origin allowlist stays irrelevant.
 *  - One place to enforce the timeout §12 requires of every external fetch.
 *
 * MasterPrompt §3 locks the backend to Next.js route handlers. FastAPI is a
 * deliberate, documented exception limited to weather — see DECISIONS.md D-001.
 */

const API_BASE = process.env.WEATHER_API_BASE ?? "http://127.0.0.1:8001";
const TIMEOUT_MS = 4000;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  for (const key of ["latitude", "longitude", "start_date", "end_date"]) {
    if (!params.get(key)) {
      return NextResponse.json(
        { error: `Missing required parameter: ${key}` },
        { status: 400 },
      );
    }
  }

  const upstream = new URL("/weather", API_BASE);
  upstream.search = params.toString();

  try {
    const response = await fetch(upstream, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Forecasts change slowly; this keeps the demo snappy on repeat views.
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      // 422 is the service rejecting the caller's dates/coords — a real answer
      // worth passing through. Everything else is an outage.
      const status = response.status === 422 ? 422 : 503;
      return NextResponse.json(
        { error: "Weather is unavailable right now.", upstreamStatus: response.status },
        { status },
      );
    }

    // The service already sets `stale`; pass its payload through untouched.
    return NextResponse.json(await response.json());
  } catch {
    // Timeout or the service is down. §12: never break the screen.
    return NextResponse.json(
      { error: "Weather service did not respond." },
      { status: 503 },
    );
  }
}
