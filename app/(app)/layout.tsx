import type { ReactNode } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BottomTabBar } from "@/components/shell/bottom-tab-bar";
import { MobileHeader } from "@/components/shell/mobile-header";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §6 — the shell renders once and every page mounts inside it.
 * Two navigation models, switching hard at 768px:
 *   >=768px  fixed Alpine Blue sidebar (76px icon-only, 248px from 1280px)
 *   <768px   sticky header + fixed 5-cell bottom tab bar
 *
 * The login screen lives outside this group so it inherits no shell chrome.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppSidebar />
      <MobileHeader />

      <div className="md:pl-[76px] xl:pl-[248px]">
        <main
          className={cn(
            "mx-auto w-full max-w-[1180px]",
            // Page padding per §4: 20px mobile, 32px tablet, 44px desktop.
            "px-5 pt-6 md:px-8 md:pt-[30px] xl:px-11",
            // Bottom padding clears the tab bar on mobile; §4's 48px on desktop.
            "pb-[calc(60px+env(safe-area-inset-bottom)+24px)] md:pb-12",
          )}
        >
          {children}
        </main>
      </div>

      <BottomTabBar />
    </div>
  );
}
