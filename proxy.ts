import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * DESIGN.md §11 (definition of done #4) — unauthenticated visits to any app
 * route redirect to /login. Gating here rather than in a client effect means
 * the dashboard never flashes before the redirect.
 *
 * Next 16 renamed the `middleware.ts` convention to `proxy.ts`; this is the
 * same edge hook under the current name.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginRoute = pathname === "/login";

  if (!hasSession && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so login can send them back.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /**
     * Gate app routes only. Everything with a file extension is skipped —
     * that covers icons, the manifest, sw.js, favicon, and Next's own
     * generated image routes like /apple-icon.png. Listing assets by name
     * here was how /apple-icon.png ended up 307-ing to /login: the PWA
     * install prompt needs those assets reachable while signed out.
     */
    "/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
