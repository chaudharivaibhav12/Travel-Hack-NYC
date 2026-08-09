import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { API_BASE } from "@/lib/server/api-base";

/**
 * Server-side proxy to FastAPI's POST /preferences/{category}. One route
 * handles all four categories (travel/stay/food/activities) since they only
 * differ in which table FastAPI upserts into — same rationale as
 * app/api/trips/route.ts (MasterPrompt §2.9, service URLs stay server-side).
 */

const TIMEOUT_MS = 6000;
const VALID_CATEGORIES = new Set(["travel", "stay", "food", "activities"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Unknown preferences category." }, { status: 404 });
  }

  const user = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Sign in to save preferences." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing request body." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API_BASE}/preferences/${category}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify(body),
    });

    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: payload?.detail ?? "Couldn't save that." },
        { status: upstream.status === 422 ? 422 : 502 },
      );
    }

    return NextResponse.json(payload);
  } catch {
    // Timeout or the service is down. §12: never break the screen.
    return NextResponse.json(
      { error: "Preferences service did not respond." },
      { status: 503 },
    );
  }
}
