# Engineering Decisions

Read this file with `docs/MasterPrompt.md` and `docs/DESIGN.md` before changing
the application. Add concise entries for decisions that affect future work.

## 2026-08-09 — Google OAuth must not silently impersonate success

**Context:** The login UI previously fell back to the seeded demo user when
Supabase configuration was missing or Google OAuth failed. Teammates could not
tell whether they completed real Google authentication.

**Decision:** Google sign-in now returns a visible configuration/provider error.
The explicit `admin` / `admin123` password remains the reliable demo fallback.

**Why:** A button labeled “Continue with Google” must either start real OAuth or
explain why it cannot. Silent substitution hides broken localhost and deployment
configuration and makes authentication impossible to test honestly.

**Alternatives:** Keeping the silent fallback was rejected. Adding a separate
`/demo` button remains an option if judges need a clearer one-click fallback.

**Consequences:** Every developer must create `.env.local`, restart Next.js, and
use a redirect URL allowed by Supabase. OAuth callback errors are displayed on
the login form.

**Validation:** Run `npm run build`, `npm run lint`, and complete one Google
round trip from a teammate's localhost account.

## 2026-08-09 — Email signup uses Supabase confirmation

**Context:** The login form could authenticate existing email/password users but
offered no way to create one. The hosted Supabase project allows signup and has
email autoconfirm disabled.

**Decision:** Add `signUpWithPassword` to the shared auth provider and reuse the
login card as a sign-in/create-account toggle. A signup without a returned
session shows “check your email”; a signup with a session signs in immediately.

**Why:** This models both Supabase confirmation configurations correctly and
keeps pages independent of provider-specific response shapes.

**Alternatives:** A separate registration page was rejected because it would
duplicate the small auth surface. Disabling confirmation was rejected because
verified addresses are safer and match the current project configuration.

**Consequences:** `http://localhost:3000/login` and the deployed `/login` URL
must remain in Supabase's redirect allowlist. Supabase's default mail service is
appropriate for testing but should be replaced with custom SMTP for production.

**Validation:** `npm test`, `npm run lint`, `npm run build`, and a manual signup
using a fresh email followed by its confirmation link.
