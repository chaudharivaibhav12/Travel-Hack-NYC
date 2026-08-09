"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  authProvider,
  toAuthUserFromSession,
  type AuthResult,
  type SignUpResult,
  type AuthUser,
} from "@/lib/auth/provider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { clearSessionCookie, writeSessionCookie } from "@/lib/auth/session";

interface AuthContextValue {
  user: AuthUser | null;
  signInWithPassword: (
    identifier: string,
    password: string,
  ) => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProviderClient({
  children,
  initialUser,
}: {
  children: ReactNode;
  /** Read from the cookie on the server so there is no unauthenticated flash. */
  initialUser: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const router = useRouter();

  /**
   * Completes the Google round trip.
   *
   * `signInWithGoogle` navigates away, so it never resolves — the session
   * arrives as a code on the URL when the browser lands back on /login.
   * supabase-js exchanges it (detectSessionInUrl), and this listener turns the
   * resulting session into the cookie the rest of the app already reads.
   *
   * Mounted in the root layout, so it covers /login as well as app routes.
   */
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let active = true;

    const adopt = (session: Parameters<typeof toAuthUserFromSession>[0] | null) => {
      if (!active || !session) return;
      const nextUser = toAuthUserFromSession(session);
      writeSessionCookie(nextUser);
      setUser(nextUser);

      // Landing back on /login after the OAuth round trip, the cookie now
      // exists but the URL still says /login. Leaving the redirect to the proxy
      // means the user sits on the login screen staring at a form they already
      // completed, so navigate explicitly. `window` rather than useSearchParams
      // keeps this out of the root layout's render path.
      if (window.location.pathname === "/login") {
        const destination =
          new URLSearchParams(window.location.search).get("next") || "/";
        router.replace(destination);
      }

      router.refresh();
    };

    // Covers a session restored from storage on a cold load.
    void supabase.auth.getSession().then(({ data }) => adopt(data.session));

    // Covers the OAuth code exchange, which resolves after mount.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") return;
        adopt(session);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  const signInWithPassword = useCallback(
    async (identifier: string, password: string) => {
      const result = await authProvider.signInWithPassword(identifier, password);
      if (result.ok) {
        writeSessionCookie(result.user);
        setUser(result.user);
      }
      return result;
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const result = await authProvider.signInWithGoogle();
    if (result.ok) {
      writeSessionCookie(result.user);
      setUser(result.user);
    }
    return result;
  }, []);

  const signUpWithPassword = useCallback(
    async (email: string, password: string) => {
      const result = await authProvider.signUpWithPassword(email, password);
      if (result.ok && result.status === "signed_in") {
        writeSessionCookie(result.user);
        setUser(result.user);
      }
      return result;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authProvider.signOut();
    clearSessionCookie();
    setUser(null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut }),
    [user, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProviderClient>");
  }
  return context;
}
