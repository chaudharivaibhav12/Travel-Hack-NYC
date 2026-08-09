"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The pill recipe, shared so anything sitting in the sidebar rail matches.
 * `SignOutButton` renders a <button> rather than a <Link> but must be visually
 * identical — exporting this keeps the two from drifting apart.
 */
export function navItemClassName({
  collapsed = false,
  active = false,
}: {
  collapsed?: boolean;
  active?: boolean;
}): string {
  return cn(
    "group flex items-center rounded-full outline-none",
    "transition-colors duration-[160ms] ease-out",
    "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
    collapsed ? "h-11 w-11 justify-center" : "gap-3 px-3.5 py-2.5",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground"
      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );
}

/**
 * DESIGN.md §7 (NavItem) — full-pill row, 10px/14px padding, 12px gap,
 * 18px icon + 14px label. Exactly one active item, driven by the route.
 */
export function NavItem({
  label,
  href,
  icon: Icon,
  active,
  collapsed = false,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={navItemClassName({ collapsed, active })}
    >
      <Icon size={18} strokeWidth={1.5} className="shrink-0" />
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span
          className={cn(
            "truncate text-sm leading-5 tracking-[0.1px]",
            active ? "font-medium" : "font-normal",
          )}
        >
          {label}
        </span>
      )}
    </Link>
  );
}
