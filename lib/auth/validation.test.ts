import { describe, expect, it } from "vitest";
import { validateSignUp } from "./validation";

describe("validateSignUp", () => {
  it("accepts a valid email with matching passwords", () => {
    expect(
      validateSignUp({
        email: "traveler@example.com",
        password: "mountains123",
        confirmPassword: "mountains123",
      }),
    ).toBeNull();
  });

  it("rejects malformed email addresses", () => {
    expect(
      validateSignUp({
        email: "traveler",
        password: "mountains123",
        confirmPassword: "mountains123",
      }),
    ).toBe("Enter a valid email address.");
  });

  it("requires at least eight password characters", () => {
    expect(
      validateSignUp({
        email: "traveler@example.com",
        password: "short",
        confirmPassword: "short",
      }),
    ).toBe("Use at least 8 characters for your password.");
  });

  it("rejects passwords that do not match", () => {
    expect(
      validateSignUp({
        email: "traveler@example.com",
        password: "mountains123",
        confirmPassword: "mountains456",
      }),
    ).toBe("The passwords do not match.");
  });
});
