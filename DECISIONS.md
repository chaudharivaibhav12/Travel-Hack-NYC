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
