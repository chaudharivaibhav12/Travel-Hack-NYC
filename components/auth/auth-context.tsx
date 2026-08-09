"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authProvider, type AuthResult, type AuthUser } from "@/lib/auth/provider";
import { clearSessionCookie, writeSessionCookie } from "@/lib/auth/session";

interface AuthContextValue {
  user: AuthUser | null;
  signInWithPassword: (
    identifier: string,
    password: string,
  ) => Promise<AuthResult>;
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

  const signOut = useCallback(async () => {
    await authProvider.signOut();
    clearSessionCookie();
    setUser(null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, signInWithPassword, signInWithGoogle, signOut }),
    [user, signInWithPassword, signInWithGoogle, signOut],
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
