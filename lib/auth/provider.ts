/**
 * The ONLY auth surface the UI knows about.
 *
 * Supabase swaps in by writing a `SupabaseAuthProvider` that implements this
 * interface and changing the single export at the bottom of this file. No page
 * or component imports Supabase directly, so that swap touches one file.
 *
 * MasterPrompt.md §12: if Google OAuth fails, signing in as the seeded demo
 * user must still work instantly. That is why `signInWithGoogle` resolves to
 * the demo user rather than throwing when no OAuth client is configured.
 */

export interface AuthUser {
  id: string;
  /** Display name, first name first. Used by the greeting. */
  name: string;
  email: string;
  /** How this session was established — surfaced in Settings later. */
  method: "password" | "google";
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

export interface AuthProvider {
  signInWithPassword(identifier: string, password: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<AuthResult>;
  signOut(): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Local provider — the implementation used until Supabase lands.             */
/* -------------------------------------------------------------------------- */

import { DEMO_USER } from "@/lib/data/demo-user";

/** Accepted sign-ins for the demo. Username or the equivalent email. */
const DEMO_CREDENTIALS = {
  identifiers: ["admin", DEMO_USER.email],
  password: "admin123",
} as const;

/** Small delay so the button's pending state is visible rather than a flicker. */
const SIMULATED_LATENCY_MS = 350;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class LocalAuthProvider implements AuthProvider {
  async signInWithPassword(
    identifier: string,
    password: string,
  ): Promise<AuthResult> {
    await wait(SIMULATED_LATENCY_MS);

    const normalized = identifier.trim().toLowerCase();

    if (normalized.length === 0) {
      return { ok: false, error: "Enter your email or username." };
    }
    if (password.length === 0) {
      return { ok: false, error: "Enter your password." };
    }

    const identifierMatches = (
      DEMO_CREDENTIALS.identifiers as readonly string[]
    ).includes(normalized);

    if (!identifierMatches || password !== DEMO_CREDENTIALS.password) {
      // One message for both cases — never reveal which half was wrong.
      return { ok: false, error: "That email or password isn't right." };
    }

    return { ok: true, user: { ...DEMO_USER, method: "password" } };
  }

  async signInWithGoogle(): Promise<AuthResult> {
    await wait(SIMULATED_LATENCY_MS);
    // No OAuth client is configured yet. Per MasterPrompt §12 the fallback is
    // to sign in as the seeded demo user rather than surface an error.
    return { ok: true, user: { ...DEMO_USER, method: "google" } };
  }

  async signOut(): Promise<void> {
    await wait(0);
  }
}

/** Replace this line — and only this line — when Supabase is wired up. */
export const authProvider: AuthProvider = new LocalAuthProvider();
