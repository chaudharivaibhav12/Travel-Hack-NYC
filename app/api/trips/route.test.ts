import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { POST } from "./route";

const user = {
  id: "6f06b0f5-f09a-4fb2-b0d8-9ac42d9783c1",
  name: "Maya Patel",
  email: "maya@example.com",
  method: "google" as const,
};

const validBody = {
  event_name: "Kazbegi Roadtrip",
  event_location: "Kazbegi, Georgia",
  checkin: "2026-09-10",
  checkout: "2026-09-13",
};

function request(body: unknown, signedIn = true): NextRequest {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (signedIn) headers.set("Cookie", `${SESSION_COOKIE}=${encodeSession(user)}`);
  return new NextRequest("http://localhost:3000/api/trips", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/trips", () => {
  it("requires an authenticated session", async () => {
    const response = await POST(request(validBody, false));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Sign in to create a trip." });
  });

  it("rejects missing fields before geocoding", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ ...validBody, event_name: "" }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a readable error when geocoding finds nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 })),
    );

    const response = await POST(request(validBody));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: `Couldn't find "Kazbegi, Georgia". Try a city and country.`,
    });
  });

  it("derives ownership from the session and creates the trip", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ results: [{ latitude: 42.65, longitude: 44.64 }] }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ trip_id: "trip-1", trip: { id: "trip-1" } }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ ...validBody, user_id: "forged-user" }));

    expect(response.status).toBe(200);
    const upstreamInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(upstreamInit.body))).toMatchObject({
      user_id: user.id,
      lat: 42.65,
      lng: 44.64,
    });
  });

  it("returns 503 when FastAPI is unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ results: [{ latitude: 42.65, longitude: 44.64 }] }),
          { status: 200 },
        ),
      )
      .mockRejectedValueOnce(new Error("connection refused"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(validBody));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Trip service did not respond." });
  });
});
