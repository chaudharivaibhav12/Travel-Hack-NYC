import {
  BookOpen,
  Bell,
  Briefcase,
  Compass,
  Home,
  Map,
  NotebookPen,
  Settings,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * DESIGN.md §7 — the nav list is defined ONCE and consumed by both the
 * desktop sidebar and the mobile bottom bar. Never hand-write the list twice;
 * the two shells must not be able to drift apart.
 */
export interface NavItem {
  /** Full label, used in the sidebar. */
  label: string;
  /** Short label for the 5-cell bottom bar, where horizontal room is tight. */
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  /** True when a real screen exists. False routes render an EmptyState. */
  built: boolean;
  /** True when this item appears in the <768px bottom tab bar. Exactly 5. */
  inTabBar: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "Home",
    shortLabel: "Home",
    href: "/",
    icon: Home,
    built: true,
    inTabBar: true,
  },
  {
    label: "Explore",
    shortLabel: "Explore",
    href: "/explore",
    icon: Compass,
    built: false,
    inTabBar: true,
  },
  {
    label: "Plan your trip",
    shortLabel: "Plan",
    href: "/plan",
    icon: NotebookPen,
    built: true,
    inTabBar: true,
  },
  {
    label: "My Trips",
    shortLabel: "Trips",
    href: "/trips",
    icon: Briefcase,
    built: false,
    inTabBar: true,
  },
  {
    label: "Group Trips",
    shortLabel: "Group",
    href: "/trips/group",
    icon: Users,
    built: false,
    inTabBar: false,
  },
  {
    label: "Expenses",
    shortLabel: "Expenses",
    href: "/expenses",
    icon: Wallet,
    built: true,
    inTabBar: false,
  },
  {
    label: "Travel Log",
    shortLabel: "Log",
    href: "/log",
    icon: BookOpen,
    built: false,
    inTabBar: false,
  },
  {
    label: "Map",
    shortLabel: "Map",
    href: "/map",
    icon: Map,
    built: false,
    inTabBar: false,
  },
  {
    label: "Notifications",
    shortLabel: "Alerts",
    href: "/notifications",
    icon: Bell,
    built: false,
    inTabBar: false,
  },
  {
    label: "Profile",
    shortLabel: "Profile",
    href: "/profile",
    icon: User,
    built: false,
    inTabBar: true,
  },
  {
    label: "Settings",
    shortLabel: "Settings",
    href: "/settings",
    icon: Settings,
    built: false,
    inTabBar: false,
  },
] as const;

/** The 5 cells of the mobile bottom bar, in nav order. */
export const TAB_BAR_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item.inTabBar,
);

/** Everything not in the tab bar — reachable from the mobile "More" sheet. */
export const OVERFLOW_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => !item.inTabBar,
);

/**
 * Exactly one nav item is active at a time. "/" must match exactly, otherwise
 * every route would light up Home.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
