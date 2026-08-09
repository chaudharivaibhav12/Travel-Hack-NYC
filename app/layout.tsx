import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { AuthProviderClient } from "@/components/auth/auth-context";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import "./globals.css";

/**
 * DESIGN.md §3 — Fraunces for display, DM Sans for body.
 * next/font self-hosts both, so there is no remote @import and no layout shift.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sage Adventurer",
  description:
    "Most travel apps know where you want to go. Sage learns how you travel.",
  applicationName: "Sage Adventurer",
  appleWebApp: {
    capable: true,
    title: "Sage",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#294C60", // Alpine Blue
  // viewport-fit=cover is required for the tab bar's safe-area padding.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the session on the server so the shell never flashes signed-out.
  const cookieStore = await cookies();
  const initialUser = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <AuthProviderClient initialUser={initialUser}>
          {children}
        </AuthProviderClient>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
