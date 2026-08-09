import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandLockup } from "@/components/shell/brand-mark";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in · Sage Adventurer",
};

/**
 * DESIGN.md §7 (AuthCard). Two-panel above 1024px: an Alpine Blue field on the
 * left, the card on the right. Below 1024px the panel is dropped and the card
 * centers. The panel is decorative — it is a valid solid field with no image.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,40%)]">
      <DecorPanel />

      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center gap-5 text-center">
            <BrandLockup tone="onLight" />
            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-[26px] font-medium leading-8 tracking-[-0.2px] text-foreground">
                Explore more. Worry less.
              </h1>
              <p className="text-[12.5px] leading-[18px] text-muted-foreground">
                Sign in to pick up where your planning left off.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-lift sm:p-9">
            <Suspense fallback={<FormSkeleton />}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-5 text-center text-[12.5px] leading-[18px] text-muted-foreground">
            Demo access — username{" "}
            <span className="font-medium text-foreground">admin</span>, password{" "}
            <span className="font-medium text-foreground">admin123</span>
          </p>
        </div>
      </div>
    </main>
  );
}

/** Left field. Hidden below 1024px. No image dependency. */
function DecorPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-sidebar lg:block">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 600 900"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        {/* Layered ridgelines in sidebar-raised — decorative, theme-only. */}
        <path
          d="M0 640 L140 470 L250 590 L340 500 L460 660 L600 540 L600 900 L0 900 Z"
          className="fill-sidebar-raised opacity-70"
        />
        <path
          d="M0 760 L120 640 L230 720 L360 610 L470 730 L600 660 L600 900 L0 900 Z"
          className="fill-sidebar-raised opacity-45"
        />
        <circle cx="470" cy="180" r="52" className="fill-sidebar-primary opacity-25" />
      </svg>

      <div className="relative flex h-full flex-col justify-end p-14">
        <p className="max-w-[22ch] font-display text-[28px] font-medium leading-9 text-sidebar-foreground">
          Most travel apps know where you want to go.
        </p>
        <p className="mt-3 max-w-[26ch] text-sm leading-6 text-sidebar-muted">
          Sage learns how you travel — and remembers.
        </p>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="sage-skeleton h-[68px]" />
      <div className="sage-skeleton h-[68px]" />
      <div className="sage-skeleton h-11 rounded-full" />
    </div>
  );
}
