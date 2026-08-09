import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { POST } from "./route";

function request(signedIn = true) {
  const headers = new Headers();
  if (signedIn) {
    headers.set("Cookie", `${SESSION_COOKIE}=${encodeSession({ id: "user-1", name: "Maya", email: "maya@example.com", method: "google" })}`);
  }
  return new NextRequest("http://localhost:3000/api/trips/trip-1/itinerary", { method: "POST", headers });
}

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/trips/[id]/itinerary", () => {
  it("requires a signed-in user", async () => {
    const response = await POST(request(false), { params: Promise.resolve({ id: "trip-1" }) });
    expect(response.status).toBe(401);
  });

  it("passes a generated itinerary through", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ itinerary: { provider: "claude" } }), { status: 200 })));
    const response = await POST(request(), { params: Promise.resolve({ id: "trip-1" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ itinerary: { provider: "claude" } });
  });

  it("preserves the incomplete-preferences conflict", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Complete preferences" }), { status: 409 })));
    const response = await POST(request(), { params: Promise.resolve({ id: "trip-1" }) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Complete preferences" });
  });
});
