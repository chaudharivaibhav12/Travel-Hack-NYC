"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { DEMO_USER, firstNameOf } from "@/lib/data/demo-user";

/**
 * DESIGN.md §7 (GreetingHeader) — Fraunces 26 greeting on the left, a circular
 * 40px bell on the right. Unread state is a 7px primary dot, never a count badge.
 */
export function GreetingHeader({ hasUnread = true }: { hasUnread?: boolean }) {
  const { user } = useAuth();
  const firstName = firstNameOf(user ?? DEMO_USER);

  return (
    <header className="flex items-start justify-between gap-4">
      <h1 className="font-display text-[26px] font-medium leading-8 tracking-[-0.2px] text-foreground">
        {greetingForNow()}, {firstName}
      </h1>

      <Link
        href="/notifications"
        aria-label={
          hasUnread ? "Notifications, unread" : "Notifications"
        }
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-page transition-[background-color,box-shadow] duration-[160ms] ease-out hover:bg-accent"
      >
        <Bell size={18} strokeWidth={1.5} />
        {hasUnread ? (
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full bg-primary"
          />
        ) : null}
      </Link>
    </header>
  );
}

/**
 * DESIGN.md §9 — the greeting word follows the time of day.
 * Computed on the client so it reflects the viewer's clock, not the server's.
 */
function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
