import { API_BASE } from "@/lib/server/api-base";
import type { Trip } from "@/lib/server/trips";

/**
 * Server-only read of GET /trips/{id}/plan — the deterministic group
 * consensus + live Stay22 hotel search. See backend/main.py's
 * `get_trip_plan` for what's computed vs. what's a placeholder until
 * ANTHROPIC_API_KEY / AEROXPLORER_TOKEN exist.
 */

export interface PlanMember {
  member_id: string;
  name: string;
  travel: {
    origin_city: string;
    origin_airport: string;
    departure_date: string;
    return_date: string;
    flight_budget: number;
    departure_time_pref: string;
    date_flexibility: string;
  } | null;
  stay: unknown | null;
  food: unknown | null;
  activities: unknown | null;
}

export interface FlightGroup {
  date: string;
  members: string[];
}

export interface PlanConsensus {
  stay: {
    budget_min: number | null;
    budget_max: number | null;
    property_types: string[];
    vibes: string[];
    needs: string[];
  };
  food: {
    cuisines: string[];
    dietary: string[];
    meal_budget: string | null;
  };
  activities: {
    interests: string[];
    pace: string | null;
    must_sees: { name: string; must_sees: string }[];
  };
  flights: {
    groups: FlightGroup[];
    warnings: string[];
  };
}

export interface HotelResult {
  id: string;
  name: string;
  type: string;
  url: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
  rating: number | null;
  price_total: number | null;
  price_per_night: number | null;
  currency: string;
  booking_links: { supplier: string; link: string }[];
}

export interface HotelsResponse {
  available: boolean;
  total: number;
  nights: number;
  currency: string;
  accommodations: HotelResult[];
}

export interface TripPlan {
  trip: Trip;
  members: PlanMember[];
  members_completed: number;
  members_total: number;
  consensus: PlanConsensus;
  hotels: HotelsResponse;
  ai_summary: string | null;
  notes: string[];
}

/** §12: an unreachable plan service degrades to null — the page renders its own explanatory state. */
export async function getTripPlan(tripId: string): Promise<TripPlan | null> {
  try {
    const url = new URL(`/trips/${tripId}/plan`, API_BASE);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    return (await response.json()) as TripPlan;
  } catch {
    return null;
  }
}
