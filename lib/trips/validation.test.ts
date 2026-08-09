import { describe, expect, it } from "vitest";
import { validateTrip } from "./validation";

const validTrip = {
  eventName: "Kazbegi Roadtrip",
  eventLocation: "Kazbegi, Georgia",
  checkin: "2026-09-10",
  checkout: "2026-09-13",
};

describe("validateTrip", () => {
  it("accepts a complete trip with increasing dates", () => {
    expect(validateTrip(validTrip)).toBeNull();
  });

  it("requires a trip name and destination", () => {
    expect(validateTrip({ ...validTrip, eventName: " " })).toBe("Enter a trip name.");
    expect(validateTrip({ ...validTrip, eventLocation: " " })).toBe("Enter a destination.");
  });

  it("requires both dates", () => {
    expect(validateTrip({ ...validTrip, checkin: "" })).toBe("Choose a check-in date.");
    expect(validateTrip({ ...validTrip, checkout: "" })).toBe("Choose a check-out date.");
  });

  it("requires checkout after checkin", () => {
    expect(validateTrip({ ...validTrip, checkout: validTrip.checkin })).toBe(
      "Check out must be after check in.",
    );
    expect(validateTrip({ ...validTrip, checkout: "2026-09-09" })).toBe(
      "Check out must be after check in.",
    );
  });
});
