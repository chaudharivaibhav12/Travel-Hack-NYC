"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, TAB_BAR_ITEMS } from "@/lib/config/nav";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §7 (BottomTabBar) — <768px only. Five cells from the SAME nav
 * config the sidebar uses. 60px tall plus env(safe-area-inset-bottom) so it
 * clears the iOS home indicator when installed as a PWA.
 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden",
        "safe-area-bottom",
      )}
    >
      <ul className="flex h-[60px] items-stretch">
        {TAB_BAR_ITEMS.map((item) => {
          const active = isNavItemActive(item.href, pathname);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 outline-none",
                  "transition-colors duration-[140ms] ease-out",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[10.5px] leading-none tracking-[0.1px]">
                  {item.shortLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
