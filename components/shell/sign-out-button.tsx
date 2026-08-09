"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { navItemClassName } from "@/components/shell/nav-item";
import { cn } from "@/lib/utils";

/**
 * Sign out from the sidebar rail.
 *
 * The mobile drawer already had one; the sidebar did not, which left every
 * viewport at or above 768px with no way to sign out at all.
 *
 * Rendered as a <button> rather than a <Link> because signing out is an action,
 * not a destination — but it borrows `navItemClassName` so it sits in the rail
 * as one more pill and matches DESIGN.md §7 without a second style definition.
 */
export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const { signOut } = useAuth();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    // Guard against a double click firing two sign-outs mid-redirect.
    if (pending) return;
    setPending(true);
    try {
      await signOut();
    } finally {
      // `signOut` redirects to /login, so this only matters if it failed.
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={pending}
      title={collapsed ? "Sign out" : undefined}
      className={cn(
        navItemClassName({ collapsed }),
        "w-full disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
      {collapsed ? (
        <span className="sr-only">Sign out</span>
      ) : (
        <span className="truncate text-sm font-normal leading-5 tracking-[0.1px]">
          {pending ? "Signing out…" : "Sign out"}
        </span>
      )}
    </button>
  );
}
