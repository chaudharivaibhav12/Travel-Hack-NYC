"use client";

import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/shell/brand-mark";
import { NavItem } from "@/components/shell/nav-item";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { isNavItemActive, NAV_ITEMS } from "@/lib/config/nav";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §6 — Alpine Blue spine. 248px expanded at >=1280px, 76px
 * icon-only from 768–1279px, hidden entirely below 768px (the bottom tab bar
 * takes over). The collapse is driven by CSS breakpoints rather than state so
 * there is nothing to hydrate and nothing to get out of sync.
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col bg-sidebar",
        "md:flex md:w-[76px] md:px-4 md:py-6",
        "xl:w-[248px] xl:px-[18px] xl:py-[26px]",
      )}
    >
      {/* Brand — mark only when collapsed, full lockup when expanded. */}
      <div className="mb-7 flex items-center justify-center xl:justify-start">
        <BrandMark className="xl:hidden" />
        <BrandLockup className="hidden xl:inline-flex" />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto">
        <ul className="flex flex-col items-center gap-1 xl:items-stretch">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="w-full">
              {/* Collapsed pill below xl, full-width pill at xl and up. */}
              <span className="xl:hidden">
                <NavItem
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  active={isNavItemActive(item.href, pathname)}
                  collapsed
                />
              </span>
              <span className="hidden xl:block">
                <NavItem
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  active={isNavItemActive(item.href, pathname)}
                />
              </span>
            </li>
          ))}
        </ul>
      </nav>

      {/* Pinned help link and sign out above a sidebar-border hairline divider. */}
      <div className="mt-4 flex flex-col items-center gap-1 border-t border-sidebar-border pt-4 xl:items-stretch">
        <span className="xl:hidden">
          <NavItem
            label="Need help?"
            href="/settings"
            icon={CircleHelp}
            active={false}
            collapsed
          />
        </span>
        <span className="hidden xl:block">
          <NavItem
            label="Need help?"
            href="/settings"
            icon={CircleHelp}
            active={false}
          />
        </span>

        <span className="xl:hidden">
          <SignOutButton collapsed />
        </span>
        <span className="hidden xl:block">
          <SignOutButton />
        </span>
      </div>
    </aside>
  );
}
