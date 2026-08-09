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

/* -------------------------------------------------------------------------- */
/* Supabase provider — real auth, with the §12 fallback preserved.            */
/* -------------------------------------------------------------------------- */

import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Supabase's user shape -> the only user shape the UI knows about. */
export function toAuthUser(
  user: User,
  method: AuthUser["method"],
): AuthUser {
  const metadata = user.user_metadata as {
    full_name?: string;
    name?: string;
  } | null;

  const name =
    metadata?.full_name?.trim() ||
    metadata?.name?.trim() ||
    user.email?.split("@")[0] ||
    "Traveler";

  return { id: user.id, name, email: user.email ?? "", method };
}

export function toAuthUserFromSession(session: Session): AuthUser {
  const provider = session.user.app_metadata?.provider;
  return toAuthUser(session.user, provider === "google" ? "google" : "password");
}

/** True when the identifier/password pair is the seeded demo login. */
function isDemoLogin(identifier: string, password: string): boolean {
  const normalized = identifier.trim().toLowerCase();
  return (
    (DEMO_CREDENTIALS.identifiers as readonly string[]).includes(normalized) &&
    password === DEMO_CREDENTIALS.password
  );
}

class SupabaseAuthProvider implements AuthProvider {
  private readonly local = new LocalAuthProvider();

  async signInWithPassword(
    identifier: string,
    password: string,
  ): Promise<AuthResult> {
    // The login screen advertises admin/admin123, and §12 requires that path to
    // keep working regardless of Supabase's state. Check it first — these are
    // not real Supabase users and would always fail upstream.
    if (isDemoLogin(identifier, password)) {
      return this.local.signInWithPassword(identifier, password);
    }

    const supabase = getSupabaseClient();
    if (!supabase) return this.local.signInWithPassword(identifier, password);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier.trim(),
        password,
      });

      // A rejected credential is a real answer, not an outage: surface it.
      // Falling back to the demo user here would sign people in on a wrong
      // password, which is worse than an error message.
      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: "That email or password isn't right." };

      return { ok: true, user: toAuthUser(data.user, "password") };
    } catch {
      // Network/infrastructure failure — §12 says degrade, don't break.
      return this.local.signInWithPassword(identifier, password);
    }
  }

  async signInWithGoogle(): Promise<AuthResult> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.local.signInWithGoogle();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Return to /login: `proxy.ts` lets that route through without a
          // session cookie, so the code can be exchanged before redirecting on.
          redirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) return this.local.signInWithGoogle();

      // The browser is navigating to Google. Nothing resolves after this —
      // AuthProviderClient picks the session up when we land back on /login.
      return new Promise<AuthResult>(() => {});
    } catch {
      return this.local.signInWithGoogle();
    }
  }

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return this.local.signOut();
    try {
      await supabase.auth.signOut();
    } catch {
      // Local session is cleared by the caller regardless.
    }
  }
}

/** Replace this line — and only this line — when Supabase is wired up. */
export const authProvider: AuthProvider = new SupabaseAuthProvider();
