import { API_BASE } from "@/lib/server/api-base";

/**
 * Server-only read of a member's saved preferences across all four
 * categories. Powers the wizard's pre-fill and the trip page's completion
 * checkmarks — never imported from a "use client" file.
 */

export interface TravelPreferences {
  id: string;
  member_id: string;
  trip_id: string;
  origin_city: string;
  origin_airport: string;
  departure_date: string;
  return_date: string;
  flight_budget: number;
  departure_time_pref: string;
  date_flexibility: string;
}

export interface StayPreferences {
  id: string;
  member_id: string;
  trip_id: string;
  budget_min: number;
  budget_max: number;
  property_types: string[];
  vibes: string[];
  needs: string[];
}

export interface FoodPreferences {
  id: string;
  member_id: string;
  trip_id: string;
  cuisines: string[];
  dietary: string[];
  meal_budget: string;
}

export interface ActivitiesPreferences {
  id: string;
  member_id: string;
  trip_id: string;
  interests: string[];
  pace: string;
  must_sees: string;
}

export interface MemberPreferences {
  travel: TravelPreferences | null;
  stay: StayPreferences | null;
  food: FoodPreferences | null;
  activities: ActivitiesPreferences | null;
}

const EMPTY_PREFERENCES: MemberPreferences = {
  travel: null,
  stay: null,
  food: null,
  activities: null,
};

/** §12: an unreachable preferences service degrades to "nothing filled in yet". */
export async function getMemberPreferences(
  tripId: string,
  memberId: string,
): Promise<MemberPreferences> {
  try {
    const url = new URL(`/preferences/${tripId}/${memberId}`, API_BASE);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return EMPTY_PREFERENCES;

    return (await response.json()) as MemberPreferences;
  } catch {
    return EMPTY_PREFERENCES;
  }
}
