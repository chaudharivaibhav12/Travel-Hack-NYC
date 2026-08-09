# Sage Adventurer

> Most travel apps know *where* I want to go. Sage learns *how* I travel.

An AI travel-planning PWA. This repo currently contains the **UI layer**: auth,
the responsive app shell, and three built screens. The recommendation engine,
Supabase, and the AI layer land on top of it.

**Read before writing code:** [`MasterPrompt.md`](./MasterPrompt.md) (product +
engineering rules, ownership map) and [`DESIGN.md`](./DESIGN.md) (the Alpine
theme — colors, type, components, definition of done). If a chat request
contradicts those files, the files win.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign in with **`admin`** / **`admin123`**, or use the Google button (see below).

> **Windows PowerShell:** run each command on its own line. Windows PowerShell
> 5.1 (the blue-icon one that ships with Windows) does not support `&&` and
> fails with *"The token '&&' is not a valid statement separator"*. Use `;` to
> chain, or install PowerShell 7+, where `&&` works as expected.

> The first build fetches Fraunces and DM Sans from Google Fonts via
> `next/font`, which self-hosts them into `.next`. That step needs internet
> once; afterwards builds work offline.

```bash
npm run build        # production build
npm start            # serve it
npx tsc --noEmit     # type check (strict, must stay clean)
npx eslint .         # lint
```

---

## Auth

Everything routes through **one interface** — `lib/auth/provider.ts`:

```ts
interface AuthProvider {
  signInWithPassword(identifier: string, password: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<AuthResult>;
  signOut(): Promise<void>;
}
```

No page or component imports Supabase. To wire up the real backend, write a
`SupabaseAuthProvider` implementing that interface and change the last line of
the file:

```ts
export const authProvider: AuthProvider = new SupabaseAuthProvider();
```

Nothing else changes.

**Current behaviour**

| | |
|---|---|
| Password | `admin` (or `admin@sage.travel`) / `admin123` |
| Google | No OAuth client configured yet, so it signs in as the seeded demo user — the `MasterPrompt.md` §12 fallback. Swap in real OAuth inside `signInWithGoogle`. |
| Session | A `sage_session` cookie. Demo-grade, not a security boundary; Supabase replaces it with a signed JWT. |
| Route gating | `proxy.ts` redirects signed-out visitors to `/login` before React mounts, so the dashboard never flashes. Paths with a file extension are skipped so PWA assets stay reachable. |

---

## Screens

| Route | State |
|---|---|
| `/login` | **Built** — email/password + Google, two-panel above 1024px |
| `/` | **Built** — the full dashboard: greeting, search, 4 quick actions, trip + budget ring, stat strip, banner |
| `/plan` | **Built** — day-by-day itinerary |
| `/expenses` | **Built** — large budget ring, per-category bars with over/under variance |
| `/explore` `/trips` `/trips/group` `/log` `/map` `/notifications` `/profile` `/settings` | Styled empty states — real routes, so the nav never lies |

---

## Shell

Two navigation models, switching hard at **768px**:

- **≥768px** — Alpine Blue sidebar, icon-only at 76px, expanding to 248px at 1280px
- **<768px** — sticky header + fixed 5-cell bottom tab bar, with the remaining
  six nav items in a "More" sheet

Both render from the same array in **`lib/config/nav.ts`**. Add a nav item once
and it appears in both. Never hand-write the list twice.

---

## Rules that will bite you

1. **No raw hex in components.** Every color is a token in `styles/tokens.css`.
   The only exemption is the Google `G` mark, whose brand colors can't be themed.
2. **No `text-white`, no pure `#fff`** backgrounds. The canvas is Snow, cards
   are `#FDFEFD`.
3. **Pine Green is the only accent** — one per section, max.
4. **All money goes through `lib/config/currency.ts`.** USD, not INR: the theme
   mockups show ₹ but `MasterPrompt.md` §9 fixes the demo in dollars.
5. **TypeScript strict.** No `any`, no `@ts-ignore`, no disabled lint lines.
6. **The service worker does nothing on purpose.** It exists so the install
   prompt appears. Do not add caching — a stale response mid-demo is exactly
   the failure `MasterPrompt.md` §12 is written to prevent.

---

## Layout

```text
app/
  (app)/          # shell group — sidebar + tab bar wrap every page here
    layout.tsx
    page.tsx      # home dashboard
    plan/  expenses/  explore/  trips/  ...
  login/          # outside the group, so it inherits no shell chrome
  layout.tsx      # fonts, metadata, auth context, SW registration
  manifest.ts     # PWA manifest
components/
  shell/          # app-sidebar, bottom-tab-bar, mobile-header, nav-item, brand-mark
  home/           # greeting-header, search-bar, quick-action-tile, budget-ring, …
  auth/           # login-form, google-mark, auth-context
  ui/             # card, button, input, empty-state, page-header
  pwa/
lib/
  auth/           # provider.ts  ← the Supabase swap point
  config/         # nav.ts, currency.ts
  data/           # demo-user.ts, demo-trip.ts  ← placeholders, delete when real data lands
styles/tokens.css # the Alpine theme
proxy.ts          # route gating (Next 16's renamed middleware)
```

`lib/data/*` is scaffolding. When the engine and Supabase arrive, screens read
from those and these files get **deleted, not extended**.
