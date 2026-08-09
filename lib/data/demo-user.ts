import type { AuthUser } from "@/lib/auth/provider";

/**
 * MasterPrompt.md §15 — the ONE place a user name may be invented.
 * Owned by D1 per the §7 ownership map.
 */
export const DEMO_USER: AuthUser = {
  id: "demo-user",
  name: "Aarav Sharma",
  email: "admin@sage.travel",
  method: "password",
};

export function firstNameOf(user: Pick<AuthUser, "name">): string {
  return user.name.split(" ")[0] ?? user.name;
}
