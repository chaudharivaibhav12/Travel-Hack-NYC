import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { API_BASE } from "@/lib/server/api-base";

const TIMEOUT_MS = 45000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Sign in to generate an itinerary." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const upstream = await fetch(`${API_BASE}/trips/${id}/itinerary`, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: payload?.detail ?? "Couldn't generate the itinerary." },
        { status: upstream.status === 409 ? 409 : 502 },
      );
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Itinerary generation did not respond." },
      { status: 503 },
    );
  }
}
