/**
 * Trip creation provider — the only "create a trip" surface the UI knows
 * about. Mirrors `lib/providers/weather.ts` and `lib/auth/provider.ts`:
 * swapping the transport is a one-line change at the bottom of this file, and
 * no component calls `/api/trips` directly.
 */

export interface CreateTripInput {
  eventName: string;
  /** Free text, e.g. "Kazbegi, Georgia" — resolved to coordinates server-side. */
  eventLocation: string;
  /** YYYY-MM-DD */
  checkin: string;
  /** YYYY-MM-DD */
  checkout: string;
  userId: string;
}

export type CreateTripResult =
  | { ok: true; tripId: string }
  | { ok: false; error: string };

export interface TripsProvider {
  createTrip(input: CreateTripInput): Promise<CreateTripResult>;
}

class HttpTripsProvider implements TripsProvider {
  async createTrip(input: CreateTripInput): Promise<CreateTripResult> {
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: input.eventName,
          event_location: input.eventLocation,
          checkin: input.checkin,
          checkout: input.checkout,
          user_id: input.userId,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false,
          error:
            typeof payload?.error === "string"
              ? payload.error
              : "Couldn't create that trip. Try again.",
        };
      }

      return { ok: true, tripId: payload.trip_id };
    } catch {
      return { ok: false, error: "Couldn't reach the server. Try again." };
    }
  }
}

/** Replace this line — and only this line — to swap the trips transport. */
export const tripsProvider: TripsProvider = new HttpTripsProvider();
