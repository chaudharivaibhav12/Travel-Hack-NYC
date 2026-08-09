import { describe, expect, it } from "vitest";
import { generateContextMemberToSurvey } from "./api";

describe("generateContextMemberToSurvey", () => {
  it("converts remote nested preferences for the existing planning engine", () => {
    const survey = generateContextMemberToSurvey("trip-1", {
      email: "friend@example.com",
      availability: { arrival_date: "2026-09-01", join_full_trip: false },
      budget: { band: "1000-1500", spending_priorities: ["Food"] },
      pace: { daily_pace: "relaxed", walking_tolerance: "low" },
      comfort: { dietary_preferences: "vegetarian", accessibility_needs: ["Step-free"] },
      interests: { interests: ["Museums"], must_do: "MoMA", cannot_do: ["Boats"] },
    });

    expect(survey).toMatchObject({
      tripId: "trip-1",
      arrivalDate: "2026-09-01",
      joinFullTrip: false,
      budgetBand: "1000-1500",
      dailyPace: "relaxed",
      dietaryPreferences: "vegetarian",
      interests: ["Museums"],
      mustDo: "MoMA",
      cannotDo: ["Boats"],
    });
  });
});
