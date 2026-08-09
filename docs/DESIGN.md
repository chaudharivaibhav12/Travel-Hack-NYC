# DESIGN.md — "Alpine" Theme

Design specification for **Sage Adventurer**, an AI travel-planning web app.
This document is the single source of truth for visual design. An implementer
should be able to build the UI from this file alone, without seeing any
screenshot.

Stack: **Next.js (App Router) + React + TypeScript strict**, Tailwind CSS v4
(CSS-first config in `styles/tokens.css`), lucide-react icons. This matches the
locked stack in `MasterPrompt.md` §3. The app is a **PWA** and must work on both
a phone and a projector.

---

## 1. Theme identity

**Name:** Alpine.

**Tagline from the palette sheet:** *Calm. Outdoors. Sophisticated.*
Supporting adjectives: **Calm · Outdoors · Clear**.

**Mood:** A clear morning above the treeline. Cold deep-blue water, pine, and
snow. The product feels like well-made outdoor equipment — precise, unfussy,
quietly expensive. Confidence without noise.

**Design intent:** The canvas is snow — a very slightly cool off-white, never
pure `#fff`, so cards read as objects resting on a field rather than holes in a
screen. Navigation is a deep Alpine Blue spine on the left (a bottom tab bar on
mobile). Pine Green is the single accent: it marks where the user acts or where
progress is measured, and nowhere else. Mist is the quiet fill for alternating
tiles and banners. Nothing bounces, nothing glows, nothing shouts.

**Not:** playful, neon, gradient-heavy, "wellness soft", dashboard-cold, or
generic-SaaS. In particular: no teal-to-purple gradients, and Pine Green must
never drift toward mint or lime.

---

## 2. Color tokens

All colors are semantic tokens in `oklch`. **Components must never use raw hex,
`text-white`, `bg-black`, or arbitrary `bg-[#...]` values.** Every color goes
through a token so theming and dark mode work.

### 2.1 Palette anchors (reference only, not for use in code)

The five named Alpine colors, exactly as given on the palette sheet:

| Name | Hex | Role in the UI |
| --- | --- | --- |
| **Alpine Blue** | `#294C60` | Sidebar spine, headings on light, deep ink |
| **Pine Green** | `#4D7C6F` | The single accent — CTAs, active state, progress |
| **Mist** | `#DDE7E1` | Quiet fill: alternating tiles, banners, icon chips |
| **Snow** | `#F4F7F5` | Page canvas |
| **Stone Gray** | `#6B7A78` | Secondary text, inactive icons |

Derived shades (interpolated from the five above, not new hues):

| Role | Hex reference |
| --- | --- |
| Alpine raised (sidebar hover surface) | `#345E76` |
| Pine deep (link, ring stroke, hover) | `#3C6659` |
| Pine light (sidebar active pill text, dark-mode accent) | `#6B9C8D` |
| Mist deep (banner border, track) | `#C9D8CF` |
| Card | `#FDFEFD` |
| Border | `#DCE4E4` |
| Ink | `#1B2B35` |

### 2.2 Token definitions — `styles/tokens.css`

```css
:root {
  --radius: 0.875rem; /* 14px card radius */

  /* Canvas & surfaces — Snow / card */
  --background: oklch(0.973 0.004 157);       /* #F4F7F5 Snow */
  --foreground: oklch(0.280 0.028 237);       /* #1B2B35 Ink */
  --card: oklch(0.996 0.002 146);             /* #FDFEFD */
  --card-foreground: oklch(0.280 0.028 237);
  --popover: oklch(0.996 0.002 146);
  --popover-foreground: oklch(0.280 0.028 237);

  /* Pine Green — the single accent */
  --primary: oklch(0.548 0.056 175);          /* #4D7C6F Pine Green */
  --primary-foreground: oklch(0.996 0.002 146);
  --primary-deep: oklch(0.475 0.052 172);     /* #3C6659 links, ring stroke, arrows */

  /* Mist fills (alternating tiles, banners, icon chips) */
  --accent: oklch(0.919 0.013 160);           /* #DDE7E1 Mist */
  --accent-foreground: oklch(0.340 0.032 220);

  --secondary: oklch(0.955 0.006 160);
  --secondary-foreground: oklch(0.280 0.028 237);

  --muted: oklch(0.948 0.006 165);
  --muted-foreground: oklch(0.567 0.018 187);  /* #6B7A78 Stone Gray */

  --destructive: oklch(0.538 0.146 28);        /* #B3453A */
  --destructive-foreground: oklch(0.996 0.002 146);

  --border: oklch(0.913 0.009 197);            /* #DCE4E4 */
  --input: oklch(0.913 0.009 197);
  --ring: oklch(0.548 0.056 175);

  /* Alpine Blue sidebar (its own scale — a fixed dark surface in both themes) */
  --sidebar: oklch(0.399 0.053 235);           /* #294C60 Alpine Blue */
  --sidebar-raised: oklch(0.462 0.061 235);    /* #345E76 */
  --sidebar-foreground: oklch(0.919 0.013 160);
  --sidebar-muted: oklch(0.760 0.024 200);
  --sidebar-primary: oklch(0.548 0.056 175);   /* Pine Green pill */
  --sidebar-primary-foreground: oklch(0.985 0.004 160);
  --sidebar-accent: oklch(1 0 0 / 10%);
  --sidebar-accent-foreground: oklch(0.975 0.006 160);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: oklch(0.653 0.057 173);

  /* Progress / charts — pine-led, cool support */
  --chart-1: oklch(0.548 0.056 175);   /* pine green */
  --chart-2: oklch(0.399 0.053 235);   /* alpine blue */
  --chart-3: oklch(0.707 0.050 224);   /* muted sky */
  --chart-4: oklch(0.687 0.097 55);    /* terracotta, for contrast only */
  --chart-5: oklch(0.567 0.018 187);   /* stone gray */
  --track: oklch(0.868 0.020 160);     /* #C9D8CF unfilled ring/bar track */

  /* Elevation */
  --shadow-page: 0 1px 2px oklch(0.280 0.028 237 / 5%);
  --shadow-lift: 0 6px 18px -8px oklch(0.280 0.028 237 / 16%);
}

.dark {
  --background: oklch(0.238 0.030 236);
  --foreground: oklch(0.945 0.008 160);
  --card: oklch(0.290 0.036 236);
  --card-foreground: oklch(0.945 0.008 160);
  --popover: oklch(0.290 0.036 236);
  --popover-foreground: oklch(0.945 0.008 160);

  --primary: oklch(0.653 0.057 173);           /* #6B9C8D lifted for dark */
  --primary-foreground: oklch(0.220 0.028 236);
  --primary-deep: oklch(0.720 0.055 172);

  --accent: oklch(0.345 0.040 232);
  --accent-foreground: oklch(0.930 0.010 160);

  --secondary: oklch(0.330 0.036 236);
  --secondary-foreground: oklch(0.945 0.008 160);

  --muted: oklch(0.330 0.036 236);
  --muted-foreground: oklch(0.735 0.016 190);

  --destructive: oklch(0.655 0.150 28);
  --destructive-foreground: oklch(0.975 0.006 160);

  --border: oklch(1 0 0 / 11%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.653 0.057 173);

  --sidebar: oklch(0.300 0.040 236);
  --sidebar-raised: oklch(0.360 0.048 236);
  --track: oklch(1 0 0 / 13%);

  --shadow-page: 0 1px 2px oklch(0 0 0 / 26%);
  --shadow-lift: 0 6px 18px -8px oklch(0 0 0 / 42%);
}
```

### 2.3 Register the tokens as utilities

```css
@theme inline {
  --radius-sm: calc(var(--radius) - 6px);
  --radius-md: calc(var(--radius) - 3px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 6px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-deep: var(--primary-deep);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-track: var(--track);

  --color-sidebar: var(--sidebar);
  --color-sidebar-raised: var(--sidebar-raised);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-muted: var(--sidebar-muted);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;

  --shadow-page: var(--shadow-page);
  --shadow-lift: var(--shadow-lift);
}
```

### 2.4 Color usage rules

- **Pine Green (`primary`) is the only accent.** It is allowed on: the active
  nav pill, section action links, the budget/progress ring fill, the banner
  arrow, primary buttons, and focus rings. Nowhere else. One Pine moment per
  section at most.
- **Mist (`accent`)** is allowed on: alternating quick-action tiles, the
  preferences banner, and small icon chips inside cards. Mist is a surface,
  never a text color.
- **Alpine Blue** appears in exactly two places: the sidebar surface
  (`--sidebar`) and as the base of `--foreground`. It is not a button color.
- **Stone Gray** is `muted-foreground` only — subtitles, captions, inactive
  icons. Never a background.
- Card bodies stay `card`. The page stays `background` (Snow). Never pure
  `#fff`, never `text-white`.
- The sidebar always uses the `sidebar-*` scale, never the page scale. Pine
  Green on Alpine Blue is the active pill; that pairing is the signature of the
  theme and must not be substituted.

**Contrast floors (verify, don't assume).** Pine Green `#4D7C6F` on Snow is
~4.6:1 — it passes for body text but **primary buttons must use white-adjacent
`--primary-foreground` on the Pine fill**, never Pine text on Mist (that pair
fails). Stone Gray on Snow is ~4.6:1, acceptable for the 12.5px caption sizes
specified in §3 but not below them.

---

## 3. Typography

Load fonts with a `<link>` in the root route head — never `@import` a remote
URL in CSS.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Sans:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

- **Display / headings:** Fraunces (warm high-contrast serif), weights 500–600.
  Used for the greeting, section headings, card titles, currency amounts, and
  stat numerals.
- **Body / UI:** DM Sans, weights 400–700. Used for nav labels, subtitles,
  captions, inputs, buttons, and every small label.
- Never use Inter or Poppins as the display face. Never set a serif for body copy.

### Type scale

| Role | Family | Size / line | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Greeting (page h1) | Fraunces | 26 / 32 | 500 | -0.2px |
| Section heading (h2) | Fraunces | 18 / 24 | 600 | 0 |
| Card title | Fraunces | 17 / 22 | 600 | 0 |
| Currency amount | Fraunces | 30 / 34 | 600 | -0.3px |
| Stat numeral | Fraunces | 26 / 30 | 600 | -0.2px |
| Tile title | DM Sans | 14.5 / 20 | 700 | 0.1px |
| Nav label | DM Sans | 14 / 20 | 400 (500 active) | 0.1px |
| Body / banner | DM Sans | 14 / 21 | 400 | 0 |
| Subtitle, caption | DM Sans | 12.5 / 18 | 400 | 0 |
| Section action link | DM Sans | 13 / 18 | 500 | 0 |

All UI copy is **sentence case**. No ALL-CAPS labels, no letter-spaced
micro-labels.

---

## 4. Shape, spacing, elevation

**Radius**
- Cards, tiles, stat strip, banners: `--radius` (14px) → `rounded-lg`.
- Icon chips inside cards: 13px → `rounded-[13px]`.
- Search field, active nav pill, bell button, avatar: `rounded-full`.
- No sharp 0px corners anywhere.

**Spacing rhythm** (4px base)
- Page padding: `30px` top, `44px` horizontal, `48px` bottom on desktop.
- Gap between grid items (tiles, cards): `16px`.
- Section heading to its content: `14px`.
- Between sections: `34px`.
- Card internal padding: `20–24px`. Stat cells: `24px` vertical.

**Elevation** — only two levels.
- `shadow-page` on every resting card/tile/banner (a 1px hairline lift).
- `shadow-lift` on hover for interactive cards and tiles only.
- Every card also carries a `1px solid border-border` hairline. Border and
  shadow always travel together; a card never has one without the other.
- No inner shadows, no glows, no colored shadows.

---

## 5. Iconography and imagery

- lucide-react, `1.5` stroke width, `size 18` in nav and inline, `size 24` in
  tile headers and card chips. Never mix stroke weights in one view.
- Sidebar icons: `sidebar-muted` when inactive, `sidebar-primary-foreground`
  when active (they sit on the Pine Green pill). Card icons: `foreground` at reduced
  emphasis, inside a `bg-accent` rounded chip when they lead a card.
- **Nav icon mapping (all 11 items).** Home `Home`, Explore `Compass`, Plan your
  trip `NotebookPen`, My Trips `Briefcase`, Group Trips `Users`, Expenses
  `Wallet`, Travel Log `BookOpen`, Map `Map`, Notifications `Bell`, Profile
  `User`, Settings `Settings`. Pinned bottom: Need help `CircleHelp`.
- Quick actions: Surprise Me `Compass`; Plan a Trip `NotebookPen`; Group Plan
  `Users`; Budget Smart `Wallet`. **Never `Sparkles`** (MasterPrompt §11).
- Mobile bottom tab bar uses a 5-item subset: Home, Explore, Plan, Trips,
  Profile — same icons, 22px, label 10.5px beneath.
- Brand mark: a 34px `rounded-[10px]` square filled Pine Green holding a simple
  mountain glyph in `sidebar` blue, beside the two-line wordmark
  "Sage / Adventurer" in Fraunces 600 at 16px.
- Photography, when introduced, is cool-toned alpine/landscape imagery — snow,
  water, pine, granite — always inside a `rounded-lg` frame with the standard
  hairline border. No warm-golden travel stock, no business photos. Emoji may
  appear at most once per screen (the greeting line); never inside buttons or
  nav.

---

## 6. Layout system

```text
┌──────────┬──────────────────────────────────────────────────────┐
│ sidebar  │  greeting ................................  bell     │
│ 248px    │  ┌────────────────── search (pill) ──────────────┐   │
│ alpine   │  ┌───────┬───────┬───────┬───────┐  4 quick tiles    │
│ fixed    │  Upcoming trip .......................... View all   │
│          │  ┌──────── trip card ────────┬── budget ring ──┐    │
│          │  Your itinerary at a glance ............. View plan  │
│          │  ┌───── 12 ─┬─ 5 ─┬─ 8 ─┬─ 3 ─────┐ one bordered box│
│          │  Let's continue planning                             │
│          │  ┌──── preferences banner ─────────────────── → ─┐   │
│ help     │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

- **Sidebar:** fixed, full height, Alpine Blue, `248px` expanded / `76px`
  icon-only collapsed. Padding `26px 18px`. Brand at top, the 11-item nav list
  below, `Need help?` pinned to the bottom above a `sidebar-border` hairline
  divider. Collapsing keeps icons visible (mini variant, never fully hidden) and
  the trigger always reachable.
- **Content column:** `flex-1`, `max-width: 1180px`, left-aligned within its
  padding (not centered on ultrawide — it grows to the max then stops).
- **Grids:** quick actions `4` equal columns; upcoming-trip row asymmetric
  `1.55fr / 1fr` (trip card wider than budget); stat strip a single bordered
  container split into `4` equal cells by internal `1px` dividers.

### Responsive — the shell switches at 768px

This app is a **PWA and must demo on both a phone and a projector.** The
`768px` line is a hard switch between two different navigation models, not a
reflow. Both are always built; neither is an afterthought.

| Breakpoint | Behaviour |
| --- | --- |
| ≥1280px | Full 248px Alpine Blue sidebar, as diagrammed. |
| 1024–1279px | Sidebar collapses to icon-only (76px), tooltips on hover. Page padding 32px. |
| 768–1023px | Sidebar stays icon-only. Quick actions 2×2. Trip/budget row stacks. Stat strip stays 4-up. |
| <768px | **Sidebar is replaced entirely by a bottom tab bar.** Single column, page padding 20px, `padding-bottom` reserved for the bar. Quick actions 2×2. Stat strip becomes 2×2 with dividers on both axes. Search full width under the greeting. |

**Bottom tab bar (<768px only)**
Fixed to the viewport bottom, `bg-card`, `border-t border-border`, height 60px
plus `env(safe-area-inset-bottom)` so it clears the iOS home indicator. Five
equal cells: Home, Explore, Plan, Trips, Profile. Each is a 22px icon over a
10.5px DM Sans label. Inactive `muted-foreground`; active `primary` with the
icon at stroke 2. The remaining six nav items (Group Trips, Expenses, Travel
Log, Map, Notifications, Settings) are reachable from a "More" sheet opened
from the header, not crammed into the bar.

---

## 7. Component specs

### Sidebar
Alpine Blue (`bg-sidebar`) column, `text-sidebar-foreground`. Contains brand
lockup, the 11-item nav list, bottom help link. No shadow — it separates by
color alone. Hidden entirely below 768px.

### NavItem
Full-pill row, `padding 10px 14px`, `gap 12px`, icon 18px + label 14px.
- Default: `text-sidebar-muted`, transparent background.
- Hover: `bg-sidebar-accent`, `text-sidebar-accent-foreground`.
- Active: `bg-sidebar-primary` (Pine Green), `text-sidebar-primary-foreground`,
  label weight 500. Exactly one active item; driven by the current route.
- Focus-visible: 2px `sidebar-ring` outline, 2px offset.
- Collapsed: pill shrinks to a 44px square centered icon, label hidden, name
  shown as a tooltip.

### Nav items — the full list, in order
Home · Explore · Plan your trip · My Trips · Group Trips · Expenses ·
Travel Log · Map · Notifications · Profile · Settings. Then the pinned
`Need help?` below the divider.

Defined once as a typed config array (`lib/config/nav.ts`) and consumed by both
the sidebar and the bottom bar. **Never hand-write the list twice** — the two
shells must not be able to drift apart.

Only **Home**, **Plan your trip**, and **Expenses** have real screens in this
build. The other eight route to a styled empty state (§8) — a real route with a
real frame, never a dead link or a `#`.

### BottomTabBar (<768px)
Five cells from the same nav config: Home, Explore, Plan, Trips, Profile.
`bg-card`, `border-t border-border`, no shadow. 22px icon over a 10.5px label,
`gap 4px`, cells `flex-1`. Active cell: `text-primary`, icon stroke 2. Inactive:
`text-muted-foreground`, stroke 1.5. The bar is `fixed bottom-0 inset-x-0 z-40`
with `padding-bottom: env(safe-area-inset-bottom)`; the page reserves matching
space so nothing hides under it.

### GreetingHeader
Left: `h1` "Good morning, {firstName}" in Fraunces 26 (greeting word swaps with
time of day). Right: circular 40px bell button — `bg-card`, `border-border`,
`shadow-page`; unread state adds a 7px `primary` dot at the top-right, no count
badge.

### SearchBar
Full-width pill: `bg-card`, `border-border`, `shadow-page`,
`padding 14px 20px`, `gap 12px`. Leading magnifier in `muted-foreground`,
transparent borderless input at 15px, trailing clear "✕" only when a value
exists. Focus: `ring-2 ring-ring` with the border going transparent.

### QuickActionTile
Card with `padding 20px`. Icon 24px at top with `14px` bottom margin, bold
title, then a two-line `muted-foreground` subtitle at 12.5px. Odd-indexed tiles
use `bg-accent`, even-indexed use `bg-card` — the alternation is deliberate and
must be preserved. Hover: `shadow-lift` and a `-2px` translate. Entire tile is
one button/link.

Content (fixed):
1. Surprise Me — "Take me somewhere / I've never been"
2. Plan a Trip — "Build your / perfect itinerary"
3. Group Plan — "Plan together / with friends"
4. Budget Smart — "Stay on track / with your budget"

### SectionHeader
`h2` in Fraunces 18/600 on the left, optional action link on the right in
`text-primary-deep` 13/500, baseline-aligned with the heading. Link hover adds
an underline only — never a background.

### TripCard
Card, `padding 24px`, horizontal: 52px `bg-accent` (Mist) rounded chip with
icon, then a stacked title (Fraunces 17/600) and meta line
(`muted-foreground` 13px) formatted `May 24 – May 28 · 3 Days` using an en dash
and a middot. Hover: `shadow-lift`.

### BudgetRing (Budget overview card)
Card, `padding 22px 24px`, relative. Top-left label "Budget overview" in
DM Sans 13.5/700. Below it the spent amount in Fraunces 30/600
(`$1,300`), then `of $2,000` in `muted-foreground` 12.5px.
Ring on the right, vertically centered: 86px SVG, 9px stroke, `--track`
background circle, `--primary-deep` (Pine) progress arc,
`stroke-linecap: round`, rotated `-90deg` so it starts at 12 o'clock. The
percentage sits **centered inside** the ring in `primary-deep` 12/700 — it must
never overlap or sit outside the stroke. Over 100% turns the arc `destructive`
and the percentage with it.

### StatStrip
One `card` container with a hairline border and `overflow-hidden`, divided into
4 equal cells by `1px border-border` right-dividers (last cell has none). Each
cell is center-aligned: Fraunces 26/600 numeral, then a `muted-foreground`
12.5px label 6px below. Labels: Days, Destinations, Activities, Travelers.

### PromptBanner
Full-width `bg-accent` (Mist) row with a `#C9D8CF` border, `padding 19px 22px`,
`rounded-lg`. Left: single-line 14px message in `accent-foreground`. Right: a
17px arrow in `primary-deep`. Hover slides the arrow `+3px`. The whole banner is
clickable. Preceded by a Fraunces 17/600 lead-in line ("Let's continue
planning").

### Buttons and links
- **Primary:** `bg-primary text-primary-foreground` (Pine fill, near-white
  label), `rounded-full`, `padding 10px 20px`, DM Sans 14/600. Hover darkens to
  `primary-deep`. No gradient, no shadow.
- **Secondary:** `bg-card border-border text-foreground`, same geometry, hover
  `bg-accent`.
- **Ghost:** transparent, hover `bg-accent`.
- **Inline link:** `text-primary-deep`, underline on hover only.
- Never ship the default shadcn slate/black button look. Never place two
  primary CTAs in the same section. **Never Pine text on a Mist fill** — that
  pair fails contrast (§2.4).

### AuthCard (login screen)
The login screen is the first thing a judge sees, so it carries the theme
alone — no dashboard chrome to help it.

Layout: full-viewport `bg-background` (Snow), centered card at `max-width
420px`, `padding 36px 32px`, `rounded-xl`, `border-border`, `shadow-lift`.
Above the card: the brand lockup, centered, with the Pine mountain mark. Below
the mark, a Fraunces 26/500 line ("Explore more. Worry less." — the Alpine
mockup's own copy) and a `muted-foreground` 13px subtitle.

Card contents in order:
1. Email field — label 12.5px DM Sans 500, input 44px tall, `bg-card`,
   `border-input`, `rounded-md`, focus `ring-2 ring-ring`.
2. Password field — same, with a trailing `Eye`/`EyeOff` ghost toggle.
3. Inline `destructive` error line, reserved space so the card doesn't jump.
4. Primary button, **full width** (the one place a primary button is not a
   pill-with-padding — it is `rounded-full` but `w-full`), label "Sign in".
5. Divider: hairline `border-border` with a centered `bg-card` "or" in
   `muted-foreground` 12px.
6. Google button — **secondary style, never primary**, full width, with the
   4-color Google `G` mark at 18px and the label "Continue with Google". Two
   primary CTAs stacked would violate §7.

On desktop ≥1024px the card sits in the right 40% of the screen against a
left panel filled with Alpine Blue and a single alpine photograph at 30%
opacity. The panel is decorative: if the image fails to load the panel is
still a valid solid Alpine Blue field. Below 1024px the panel is dropped
entirely and the card centers.

---

## 8. States and motion

- **Hover:** interactive cards/tiles get `shadow-lift` + `-2px` translate over
  `160ms ease-out`. Nav and ghost controls get a background change only.
- **Focus-visible:** always `ring-2 ring-ring ring-offset-2` with the offset
  color matching the surface. Never remove focus outlines.
- **Active/pressed:** `scale(0.99)`, no color inversion.
- **Disabled:** `opacity-50`, `cursor-not-allowed`, no color change.
- **Loading:** skeletons matching the real shape — Mist `bg-muted` blocks with
  the card's radius and a slow shimmer. Never spinners inside cards.
- **Empty states:** card-sized, centered, a 24px muted icon, a Fraunces 17
  line, one `muted-foreground` sentence, and at most one secondary button.
  Example: "No trips yet — plan your first one."
- **Error:** inline text in `destructive` under the field or card; toasts for
  async failures, bottom-right, `rounded-lg`, card surface.
- **Motion policy:** transitions are `140–200ms`, ease-out, on
  `transform / opacity / background-color / box-shadow` only. No entrance
  animation on page load, no staggered reveals, no parallax, no looping
  animation. Respect `prefers-reduced-motion: reduce` by disabling transforms.

---

## 9. Content and copy tone

- Sentence case everywhere, including buttons and section headings.
- Warm, concise, second person. "Plan together with friends", not
  "Collaborative itinerary management".
- Greeting adapts to time of day: Good morning / Good afternoon / Good evening,
  followed by the user's first name.
- **Currency: US dollar**, `$` prefix, grouped with commas, no decimals —
  `$1,300`. Comparative form is `of $2,000` on its own muted line. This
  overrides the `₹` shown in the theme mockups; MasterPrompt §9 fixes the demo
  in USD for a NYC audience. All formatting goes through one helper in
  `lib/config/currency.ts` — never `toLocaleString` inline in a component.
- Dates: `May 24 – May 28` (en dash, spaces). Duration appended with a middot:
  `May 24 – May 28 · 3 Days`.
- Numbers in stat cells are bare integers; the unit lives in the label below.
- Section action links are two words max: "View all", "View plan".

---

## 10. Do / Don't

**Do**
- Keep the canvas Snow and cards near-white but never pure white.
- Keep Pine Green scarce — one Pine moment per section at most.
- Pair every card border with the page shadow.
- Preserve the alternating Mist/card tile rhythm.
- Keep exactly 4 quick actions, exactly 4 stat cells, exactly one banner.
- Define nav once in `lib/config/nav.ts` and render both shells from it.

**Don't**
- No purple/indigo, no blue-to-purple gradients, no neon. **No teal** — Pine
  Green is a desaturated forest hue and must not slide toward the Mediterranean
  or Aurora themes on the palette sheet.
- No pure white (`#fff`) page or card backgrounds; no `text-white` in
  components.
- No default shadcn dark button; no two CTAs side by side.
- No "Trusted by", "As seen in", testimonial, or marketing sections — this is a
  logged-in product surface. The login screen is the one exception to "logged
  in", and it still gets no marketing copy.
- No `Sparkles` icon as a brand or empty-state mark.
- No multi-column link footer inside the app shell.
- No hardcoded hex in components; tokens only. The Google `G` mark is the sole
  exemption — its brand colors are fixed and live inside one SVG component.
- No `₹`. The mockups show it; this document overrides them (§9).

---

## 11. Implementation notes

**Where things live**
- Tokens: `styles/tokens.css` — `:root` / `.dark` for values, `@theme inline`
  for the utility mapping. Tailwind v4 has no `tailwind.config.js`.
  Imported once from `app/globals.css`.
- Fonts: `next/font/google` for Fraunces and DM Sans in `app/layout.tsx`,
  exposed as `--font-display` and `--font-sans`. Do not `@import` a remote URL
  in CSS and do not hand-write `<link>` tags — `next/font` self-hosts and
  avoids the layout shift.
- Nav config: `lib/config/nav.ts`, a single typed array (§7).
- Currency: `lib/config/currency.ts`.
- Auth: `lib/auth/provider.ts` — one interface, one local implementation.
  Supabase swaps in by replacing that file only; no page imports Supabase
  directly.
- Shell: `app/(app)/layout.tsx` renders sidebar + bottom bar once; every page
  mounts as its child. The login screen lives in a separate `app/(auth)`
  group so it does not inherit the shell.

**Route map**

| Route | Screen | State in this build |
| --- | --- | --- |
| `/login` | Auth screen | **Built.** Email/password + Google |
| `/` | Home dashboard | **Built.** Full spec above |
| `/plan` | Plan your trip | **Built.** Day-by-day itinerary rows |
| `/expenses` | Expenses | **Built.** BudgetRing (large), category rows |
| `/explore` | Destination discovery | Empty state |
| `/trips` | My trips | Empty state |
| `/trips/group` | Group trips | Empty state |
| `/log` | Travel log | Empty state |
| `/map` | Map view | Empty state |
| `/notifications` | Notifications | Empty state |
| `/profile` | Profile | Empty state |
| `/settings` | Settings | Empty state |

**Component file layout**
```text
components/
  shell/
    app-sidebar.tsx        # Alpine Blue spine, >=768px
    bottom-tab-bar.tsx     # <768px
    nav-item.tsx
    brand-mark.tsx
  ui/
    card.tsx  button.tsx  input.tsx  empty-state.tsx
  home/
    greeting-header.tsx
    search-bar.tsx
    quick-action-tile.tsx
    section-header.tsx
    trip-card.tsx
    budget-ring.tsx
    stat-strip.tsx
    prompt-banner.tsx
  auth/
    login-form.tsx
    google-mark.tsx
```

**PWA requirements**
- `app/manifest.ts` returning a typed manifest: `name` "Sage Adventurer",
  `short_name` "Sage", `display: "standalone"`, `background_color` Snow
  `#F4F7F5`, `theme_color` Alpine Blue `#294C60`.
- Maskable icons at 192 and 512, plus an apple-touch-icon. The icon is the
  Pine mountain mark on Alpine Blue with safe-area padding for maskable crops.
- A service worker registered client-side for installability only. **No offline
  sync** (MasterPrompt §11) — do not cache API responses or add a sync queue.
- `viewport-fit=cover` plus the safe-area padding on the tab bar (§7).

**Definition of done for this build**
1. Sidebar shows all 11 nav items plus the pinned help link; the active item is
   the Pine pill and follows the route.
2. Below 768px the sidebar is gone and the 5-item bottom bar is fixed, clearing
   the safe area; both shells render from the same nav config.
3. Login accepts `admin` / `admin123`, rejects anything else with an inline
   `destructive` message, and routes to `/`. Google button calls the provider
   stub without throwing.
4. Unauthenticated visits to any app route redirect to `/login`.
5. Greeting, bell, and pill search field all present and aligned.
6. Exactly 4 quick-action tiles with the specified copy and Mist/card
   alternation.
7. "Upcoming trip" row is asymmetric with a working Pine progress ring whose
   percentage sits centered inside the stroke.
8. Stat strip is one bordered box with 3 internal dividers (2×2 below 768px).
9. All amounts render as USD through the currency helper; no `₹` anywhere.
10. No raw hex or `text-white` in any component except the Google mark; dark
    mode renders correctly.
11. Keyboard focus is visible on every interactive element.
12. `tsc --noEmit` and `next build` both pass clean under strict mode.
13. The app is installable: manifest resolves, icons load, no console errors.
