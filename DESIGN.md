# DESIGN.md — "Passport" Theme

Design specification for **Sage Adventurer**, an AI travel-planning web app.
This document is the single source of truth for visual design. An implementer
should be able to build the UI from this file alone, without seeing any
screenshot.

Stack assumption: React + TypeScript, TanStack Start (file-based routes),
Tailwind CSS v4 (CSS-first config in `src/styles.css`), shadcn/ui components,
lucide-react icons. If the stack differs, keep the tokens and specs and adapt
the syntax.

---

## 1. Theme identity

**Name:** Passport.

**Mood:** A well-worn leather passport with gold foil stamps. Ink-navy, warm
paper, small precious metallic marks. The product feels like a considered
travel journal — calm, warm, premium, quietly confident.

**Design intent:** The interface is a paper surface, not a screen. The canvas is
warm cream rather than white so cards read as pages laid on a desk. Navigation
is a deep navy spine on the left. Gold is treasure, not decoration: it appears
only where the user is meant to act or measure progress. Nothing bounces,
nothing glows, nothing shouts. Density is generous — the app should feel like it
has room to breathe even when full of data.

**Not:** playful, neon, gradient-heavy, "wellness soft", dashboard-cold, or
generic-SaaS.

---

## 2. Color tokens

All colors are semantic tokens in `oklch`. **Components must never use raw hex,
`text-white`, `bg-black`, or arbitrary `bg-[#...]` values.** Every color goes
through a token so theming and dark mode work.

### 2.1 Palette anchors (reference only, not for use in code)

| Role | Hex reference |
| --- | --- |
| Navy spine | `#0F2740` |
| Navy raised | `#12324F` |
| Gold primary | `#E8B35C` |
| Gold deep (links, ring) | `#D99B3F` |
| Cream canvas | `#FAF6EF` |
| Card | `#FFFDFA` |
| Warm border | `#EEE5D7` |
| Ink | `#152438` |
| Muted ink | `#8A8375` |

### 2.2 Token definitions — `src/styles.css`

```css
:root {
  --radius: 0.875rem; /* 14px card radius */

  /* Canvas & surfaces */
  --background: oklch(0.972 0.012 85);
  --foreground: oklch(0.268 0.032 254);
  --card: oklch(0.99 0.005 85);
  --card-foreground: oklch(0.268 0.032 254);
  --popover: oklch(0.99 0.005 85);
  --popover-foreground: oklch(0.268 0.032 254);

  /* Gold — the single accent */
  --primary: oklch(0.795 0.107 76);
  --primary-foreground: oklch(0.29 0.034 254);
  --primary-deep: oklch(0.719 0.116 71);      /* links, ring stroke, arrows */

  /* Warm cream fills (alternating tiles, banners) */
  --accent: oklch(0.958 0.026 79);
  --accent-foreground: oklch(0.32 0.036 60);

  --secondary: oklch(0.968 0.008 85);
  --secondary-foreground: oklch(0.268 0.032 254);

  --muted: oklch(0.962 0.012 85);
  --muted-foreground: oklch(0.598 0.021 85);

  --destructive: oklch(0.556 0.176 26);
  --destructive-foreground: oklch(0.99 0.005 85);

  --border: oklch(0.923 0.018 82);
  --input: oklch(0.923 0.018 82);
  --ring: oklch(0.795 0.107 76);

  /* Navy sidebar (its own scale — it is a fixed dark surface in both themes) */
  --sidebar: oklch(0.256 0.046 254);
  --sidebar-raised: oklch(0.298 0.052 254);
  --sidebar-foreground: oklch(0.885 0.016 250);
  --sidebar-muted: oklch(0.758 0.026 250);
  --sidebar-primary: oklch(0.795 0.107 76);
  --sidebar-primary-foreground: oklch(0.29 0.034 254);
  --sidebar-accent: oklch(1 0 0 / 8%);
  --sidebar-accent-foreground: oklch(0.965 0.008 250);
  --sidebar-border: oklch(1 0 0 / 9%);
  --sidebar-ring: oklch(0.795 0.107 76);

  /* Progress / charts — gold-led, warm support */
  --chart-1: oklch(0.795 0.107 76);   /* gold */
  --chart-2: oklch(0.719 0.116 71);   /* gold deep */
  --chart-3: oklch(0.52 0.058 235);   /* muted navy-teal */
  --chart-4: oklch(0.68 0.078 42);    /* terracotta */
  --chart-5: oklch(0.62 0.045 160);   /* sage */
  --track: oklch(0.936 0.024 82);     /* unfilled ring/bar track */

  /* Elevation */
  --shadow-page: 0 1px 2px oklch(0.268 0.032 254 / 4%);
  --shadow-lift: 0 6px 18px -8px oklch(0.268 0.032 254 / 14%);
}

.dark {
  --background: oklch(0.205 0.028 254);
  --foreground: oklch(0.945 0.012 85);
  --card: oklch(0.252 0.032 254);
  --card-foreground: oklch(0.945 0.012 85);
  --popover: oklch(0.252 0.032 254);
  --popover-foreground: oklch(0.945 0.012 85);

  --primary: oklch(0.805 0.108 76);
  --primary-foreground: oklch(0.24 0.03 254);
  --primary-deep: oklch(0.775 0.112 73);

  --accent: oklch(0.302 0.038 254);
  --accent-foreground: oklch(0.93 0.014 85);

  --secondary: oklch(0.29 0.034 254);
  --secondary-foreground: oklch(0.945 0.012 85);

  --muted: oklch(0.29 0.034 254);
  --muted-foreground: oklch(0.712 0.02 85);

  --destructive: oklch(0.68 0.176 24);
  --destructive-foreground: oklch(0.97 0.008 85);

  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 14%);
  --ring: oklch(0.805 0.108 76);

  --sidebar: oklch(0.222 0.03 254);
  --sidebar-raised: oklch(0.268 0.036 254);
  --track: oklch(1 0 0 / 12%);

  --shadow-page: 0 1px 2px oklch(0 0 0 / 24%);
  --shadow-lift: 0 6px 18px -8px oklch(0 0 0 / 40%);
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

- Gold (`primary`) is allowed on: the active nav pill, section action links,
  the budget/progress ring fill, the banner arrow, primary buttons, focus rings.
  Nowhere else.
- Cream (`accent`) is allowed on: alternating quick-action tiles, the
  preferences banner, small icon chips inside cards.
- Card bodies stay `card`. The page stays `background`. Never pure white.
- Body text is `foreground`; every secondary/subtitle line is
  `muted-foreground`.
- The sidebar always uses the `sidebar-*` scale, never the page scale.

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
  when active (they sit on the gold pill). Card icons: `foreground` at reduced
  emphasis, inside a `bg-accent` rounded chip when they lead a card.
- Suggested mapping: Home `Home`, Explore `MapPin`, Plan a Trip `NotebookPen`,
  My Trips `Briefcase`, Group Trips `Users`, Budget `IndianRupee`, Travel Log
  `BookOpen`, Map `Map`, Notifications `Bell`, Profile `User`, Settings
  `Settings`, Need help `CircleHelp`.
- Quick actions: Surprise Me `Sparkle`-free — use `Compass`; Plan a Trip
  `NotebookPen`; Group Plan `Users`; Budget Smart `Wallet`.
- Brand mark: a small gold rounded-square (34px, `rounded-[10px]`) holding a
  simple flame/leaf glyph in navy, beside the two-line wordmark
  "Sage / Adventurer" set in Fraunces 600 at 16px.
- Photography, when introduced, is warm-toned landscape/travel imagery, always
  inside a `rounded-lg` frame with the standard hairline border. No stock
  business photos. Emoji may appear at most once per screen (e.g. after the
  greeting); never inside buttons or nav.

---

## 6. Layout system

```text
┌──────────┬──────────────────────────────────────────────────────┐
│ sidebar  │  greeting ................................  bell     │
│ 248px    │  ┌────────────────── search (pill) ──────────────┐   │
│ navy     │  ┌───────┬───────┬───────┬───────┐  4 quick tiles    │
│ fixed    │  Upcoming trip .......................... View all   │
│          │  ┌──────── trip card ────────┬── budget ring ──┐    │
│          │  Your itinerary at a glance ............. View plan  │
│          │  ┌───── 12 ─┬─ 5 ─┬─ 8 ─┬─ 3 ─────┐ one bordered box│
│          │  Let's continue planning                             │
│          │  ┌──── preferences banner ─────────────────── → ─┐   │
│ help     │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

- **Sidebar:** fixed, full height, `248px` expanded / `76px` icon-only
  collapsed. Padding `26px 18px`. Brand at top, nav list below, `Need help?`
  pinned to the bottom above a `sidebar-border` hairline divider. Collapsing
  keeps icons visible (mini variant, never fully hidden) and the trigger always
  reachable.
- **Content column:** `flex-1`, `max-width: 1180px`, left-aligned within its
  padding (not centered on ultrawide — it grows to the max then stops).
- **Grids:** quick actions `4` equal columns; upcoming-trip row asymmetric
  `1.55fr / 1fr` (trip card wider than budget); stat strip a single bordered
  container split into `4` equal cells by internal `1px` dividers.

### Responsive

| Breakpoint | Behaviour |
| --- | --- |
| ≥1280px | As above. |
| 1024–1279px | Sidebar collapses to icon-only (76px). Page padding 32px. |
| 768–1023px | Sidebar becomes an off-canvas drawer with a header trigger. Quick actions 2×2. Trip/budget row stacks. Stat strip stays 4-up. |
| <768px | Single column. Page padding 20px. Quick actions 2×2 with tighter tiles. Stat strip becomes 2×2 with dividers on both axes. Search field full width under the greeting. Bottom banner stacks its arrow to the right of wrapped text. |

---

## 7. Component specs

### Sidebar
Navy (`bg-sidebar`) column, `text-sidebar-foreground`. Contains brand lockup,
nav list, bottom help link. No shadow — it separates by color alone.

### NavItem
Full-pill row, `padding 10px 14px`, `gap 12px`, icon 18px + label 14px.
- Default: `text-sidebar-muted`, transparent background.
- Hover: `bg-sidebar-accent`, `text-sidebar-accent-foreground`.
- Active: `bg-sidebar-primary`, `text-sidebar-primary-foreground`, label
  weight 500. Exactly one active item; driven by the current route.
- Focus-visible: 2px `sidebar-ring` outline, 2px offset.
- Collapsed: pill shrinks to a 44px square centered icon, label hidden, name
  shown as a tooltip.

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
Card, `padding 24px`, horizontal: 52px `bg-accent` rounded chip with icon,
then a stacked title (Fraunces 17/600) and meta line
(`muted-foreground` 13px) formatted `May 24 – May 28 · 3 Days` using an en dash
and a middot. Hover: `shadow-lift`.

### BudgetRing (Budget overview card)
Card, `padding 22px 24px`, relative. Top-left label "Budget overview" in
DM Sans 13.5/700. Below it the spent amount in Fraunces 30/600
(`₹32,500`), then `of ₹50,000` in `muted-foreground` 12.5px.
Ring on the right, vertically centered: 86px SVG, 9px stroke, `--track`
background circle, `--primary-deep` progress arc, `stroke-linecap: round`,
rotated `-90deg` so it starts at 12 o'clock. The percentage sits **centered
inside** the ring in `primary-deep` 12/700 — it must never overlap or sit
outside the stroke. Over 100% turns the arc `destructive` and the percentage
with it.

### StatStrip
One `card` container with a hairline border and `overflow-hidden`, divided into
4 equal cells by `1px border-border` right-dividers (last cell has none). Each
cell is center-aligned: Fraunces 26/600 numeral, then a `muted-foreground`
12.5px label 6px below. Labels: Days, Destinations, Activities, Travelers.

### PromptBanner
Full-width `bg-accent` row with a slightly warmer border, `padding 19px 22px`,
`rounded-lg`. Left: single-line 14px message in `accent-foreground`. Right: a
17px arrow in `primary-deep`. Hover slides the arrow `+3px`. The whole banner is
clickable. Preceded by a Fraunces 17/600 lead-in line ("Let's continue
planning").

### Buttons and links
- **Primary:** `bg-primary text-primary-foreground`, `rounded-full`,
  `padding 10px 20px`, DM Sans 14/600. Hover darkens to `primary-deep`. No
  gradient, no shadow.
- **Secondary:** `bg-card border-border text-foreground`, same geometry, hover
  `bg-accent`.
- **Ghost:** transparent, hover `bg-accent`.
- **Inline link:** `text-primary-deep`, underline on hover only.
- Never ship the default shadcn slate/black button look. Never place two
  primary CTAs in the same section.

---

## 8. States and motion

- **Hover:** interactive cards/tiles get `shadow-lift` + `-2px` translate over
  `160ms ease-out`. Nav and ghost controls get a background change only.
- **Focus-visible:** always `ring-2 ring-ring ring-offset-2` with the offset
  color matching the surface. Never remove focus outlines.
- **Active/pressed:** `scale(0.99)`, no color inversion.
- **Disabled:** `opacity-50`, `cursor-not-allowed`, no color change.
- **Loading:** skeletons matching the real shape — cream `bg-muted` blocks with
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
- Currency: Indian rupee, `₹` prefix, grouped with commas, no decimals —
  `₹32,500`. Comparative form is `of ₹50,000` on its own muted line.
- Dates: `May 24 – May 28` (en dash, spaces). Duration appended with a middot:
  `May 24 – May 28 · 3 Days`.
- Numbers in stat cells are bare integers; the unit lives in the label below.
- Section action links are two words max: "View all", "View plan".

---

## 10. Do / Don't

**Do**
- Keep the canvas warm cream and cards near-white.
- Keep gold scarce — one gold moment per section at most.
- Pair every card border with the page shadow.
- Preserve the alternating cream/white tile rhythm.
- Keep exactly 4 quick actions, exactly 4 stat cells, exactly one banner.

**Don't**
- No purple/indigo, no blue-to-purple gradients, no neon.
- No pure white (`#fff`) page or card backgrounds; no `text-white` in
  components.
- No default shadcn dark button; no two CTAs side by side.
- No "Trusted by", "As seen in", testimonial, or marketing sections — this is a
  logged-in product surface.
- No `Sparkles` icon as a brand or empty-state mark.
- No multi-column link footer inside the app shell.
- No hardcoded hex in components; tokens only.

---

## 11. Implementation notes

**Where things live**
- Tokens: `src/styles.css` — `:root` / `.dark` for values, `@theme inline` for
  the utility mapping. Tailwind v4 has no `tailwind.config.js` on this stack.
- Fonts: `<link>` tags in the root route head (`src/routes/__root.tsx`).
- Shell: the sidebar + content frame is a layout route so it renders once and
  every page mounts into its `<Outlet />`.

**Suggested route/component map**

| Route | Screen | Key components |
| --- | --- | --- |
| `/` | Home dashboard (spec'd above) | GreetingHeader, SearchBar, QuickActionTile ×4, SectionHeader, TripCard, BudgetRing, StatStrip, PromptBanner |
| `/explore` | Destination discovery | SearchBar, filter chips, destination card grid |
| `/plan` | Itinerary builder | day-by-day timeline of TripCard-style rows |
| `/trips` | My trips | TripCard list with status chips |
| `/trips/group` | Group trips | TripCard list + member avatars |
| `/budget` | Budget detail | BudgetRing (large), category rows with progress bars |
| `/log` | Travel log | journal entries, warm image frames |
| `/map` | Map view | full-bleed map inside a rounded framed panel |
| `/notifications` | Notifications | grouped list rows, unread dot in `primary` |
| `/profile` | Profile | avatar, editable fields |
| `/settings` | Settings | grouped setting cards with switches |

**Component file layout**
```text
src/components/
  app-sidebar.tsx          # navy shell nav
  nav-item.tsx
  greeting-header.tsx
  search-bar.tsx
  quick-action-tile.tsx
  section-header.tsx
  trip-card.tsx
  budget-ring.tsx
  stat-strip.tsx
  prompt-banner.tsx
```

**Definition of done for the home screen**
1. Sidebar shows all 11 nav items plus the pinned help link; Home is the gold
   pill and follows the route.
2. Greeting, bell, and pill search field all present and aligned.
3. Exactly 4 quick-action tiles with the specified copy and cream/white
   alternation.
4. "Upcoming trip" row is asymmetric with a working gold progress ring whose
   percentage sits centered inside the stroke.
5. Stat strip is one bordered box with 3 internal dividers.
6. Preferences banner is cream with a right arrow that slides on hover.
7. No raw hex or `text-white` in any component; dark mode renders correctly.
8. Keyboard focus is visible on every interactive element.
