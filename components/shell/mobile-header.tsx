"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, LogOut, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/shell/brand-mark";
import { useAuth } from "@/components/auth/auth-context";
import { isNavItemActive, OVERFLOW_ITEMS } from "@/lib/config/nav";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §6 — below 768px the sidebar is gone, so the six nav items that
 * don't fit in the 5-cell tab bar live in a "More" sheet opened from here.
 * Cramming eleven items into the bar was the alternative; this is the spec'd one.
 */
export function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();

  /**
   * The sheet closes from the link handlers below rather than from an effect
   * on `pathname`. Watching the route and calling setState in an effect works,
   * but it renders the sheet once more over the new page before closing it.
   */
  const close = () => setOpen(false);

  // Lock body scroll while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-sm md:hidden">
        <Link href="/" className="flex items-center gap-2.5 rounded-full">
          <BrandMark size={30} tone="onLight" />
          <span className="font-display text-[15px] font-semibold leading-none text-foreground">
            Sage Adventurer
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open more menu"
          aria-expanded={open}
          className="-mr-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-foreground/25"
          />

          <div className="safe-area-bottom absolute inset-x-0 bottom-0 rounded-t-xl border-t border-border bg-card shadow-lift">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="font-display text-[17px] font-semibold leading-[22px] text-foreground">
                More
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="-mr-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <ul className="px-3 pb-2">
              {OVERFLOW_ITEMS.map((item) => {
                const active = isNavItemActive(item.href, pathname);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                        active
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-1 border-t border-border px-3 py-2">
              <Link
                href="/settings"
                onClick={close}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <CircleHelp size={18} strokeWidth={1.5} />
                Need help?
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut size={18} strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
