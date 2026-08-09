/**
 * Server-only reads from FastAPI's /trips. Called from Server Components
 * (app/(app)/trips/**) so the page can render with data already in the HTML
 * — never imported from a "use client" file, and never fetched via the
 * browser, per MasterPrompt §2.9 (service URLs stay server-side).
 */

import { API_BASE } from "@/lib/server/api-base";

export interface Trip {
  id: string;
  event_name: string;
  event_location: string;
  lat: number;
  lng: number;
  checkin: string;
  checkout: string;
  created_by: string;
  created_at: string;
}

export interface Member {
  id: string;
  trip_id: string;
  user_id: string;
  name: string;
  [key: string]: unknown;
}

/** §12: an unreachable trips service degrades to an empty list, not a crash. */
export async function getTripsForUser(userId: string): Promise<Trip[]> {
  try {
    const url = new URL("/trips", API_BASE);
    url.searchParams.set("user_id", userId);

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return [];

    const data = (await response.json()) as { trips?: Trip[] };
    return data.trips ?? [];
  } catch {
    return [];
  }
}

export async function getTrip(
  tripId: string,
): Promise<{ trip: Trip; members: Member[] } | null> {
  try {
    const url = new URL(`/trips/${tripId}`, API_BASE);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    return (await response.json()) as { trip: Trip; members: Member[] };
  } catch {
    return null;
  }
}
