import type { AuthUser } from "@/lib/auth/provider";

/**
 * Session lives in a cookie so `proxy.ts` can gate routes before React
 * ever mounts — that avoids the login screen flashing on a hard refresh.
 *
 * This is a demo session, not a security boundary. When Supabase lands it
 * issues a real signed JWT and this file is replaced wholesale.
 */
export const SESSION_COOKIE = "sage_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function encodeSession(user: AuthUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export function decodeSession(raw: string | undefined): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "name" in parsed &&
      "email" in parsed
    ) {
      return parsed as AuthUser;
    }
    return null;
  } catch {
    return null;
  }
}

/** Client-side write. `Secure` is omitted so this works on http://localhost. */
export function writeSessionCookie(user: AuthUser): void {
  document.cookie = `${SESSION_COOKIE}=${encodeSession(user)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function readSessionCookie(): AuthUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`));
  return decodeSession(match?.slice(SESSION_COOKIE.length + 1));
}
