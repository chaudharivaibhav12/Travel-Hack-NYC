import { describe, expect, it } from "vitest";
import { authMethodLabel, profileInitials } from "./profile";

describe("profileInitials", () => {
  it("uses the first two words", () => {
    expect(profileInitials("Aarav Sharma")).toBe("AS");
  });

  it("handles a single name", () => {
    expect(profileInitials("Maya")).toBe("M");
  });

  it("provides a traveler fallback", () => {
    expect(profileInitials("  ")).toBe("T");
  });
});

describe("authMethodLabel", () => {
  it("labels supported sign-in methods", () => {
    expect(authMethodLabel("google")).toBe("Google");
    expect(authMethodLabel("password")).toBe("Email and password");
  });
});
