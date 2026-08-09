# AGENTS.md — Sage Adventurer

> Source of truth for every coding agent (Claude Code, Codex, Cursor) and every human on this repo.
> Copy this file to `CLAUDE.md` and `.cursorrules` as well, or symlink them.

**Read this fully before writing code. If a request in chat contradicts this file, follow this file and say so.**

---

## 0. Constraints that shape everything

- 4 developers, working in parallel, **4 hours of build time**.
- The deliverable is a **live demo in front of judges**, not a travel platform.
- Optimize, in this order: **reliability → demo impact → visual polish → parallel velocity → extensibility**.
- Every proposed feature must answer: *does a judge see this in the 5-minute demo?* If no, it is P2. Defer it.

**One-line product thesis (memorize it):**
> Most travel apps know *where* I want to go. Sage learns *how* I travel.

---

## 1. What the demo must prove

Four things, in this order. Everything else is scaffolding.

1. **Sage learns** — user interactions produce signals.
2. **Sage remembers** — signals mutate a structured, persisted profile.
3. **Sage personalizes** — recommendations visibly change because the profile changed.
4. **Sage explains** — every recommendation states *why*, citing only real signals.

Hero interaction: **Surprise Me** — *"Take me somewhere I've never been."*

---

## 2. Non-negotiable engineering rules

These are hard rules. Do not violate them, do not ask to violate them.

1. **The LLM never does math and never ranks.** Scoring, profile updates, budget arithmetic, and consensus are pure deterministic TypeScript. The LLM only converts computed results into prose and extracts structure from free text.
2. **Never hardcode a destination into the UI.** Tawang must *win* the ranking. If it doesn't, tune weights or seed data in `lib/config/scoring.ts` — never special-case the render layer.
3. **Never fabricate personalization.** An explanation may only reference signals that exist in the event log or profile. No invented "you loved Bali."
4. **Every external service has a fallback and cannot break a screen.** AI, weather, maps, Supabase, OAuth, accommodation. All of them.
5. **No randomness in the hero path.** `Math.random()` is banned in the recommendation engine. Seeded, reproducible, identical every run.
6. **TypeScript strict mode.** No `any`, no `@ts-ignore`, no disabled ESLint lines to get past a type error.
7. **Only edit files you own** (§7). If you need a change in someone else's file, request it in the team channel or write against a local mock.
8. **All tunable numbers live in `lib/config/scoring.ts`.** Zero magic numbers scattered in components or engines.
9. **Secrets are server-side only.** No API keys in client components, no `NEXT_PUBLIC_` on anything sensitive.
10. **Prefer pure functions.** Engines take inputs and return outputs. No I/O, no fetch, no Supabase inside `lib/engine/*`.

---

## 3. Stack — locked, do not debate

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript strict |
| Styling | Tailwind CSS + CSS variables in `styles/tokens.css` |
| Backend | Next.js route handlers + server actions only |
| DB / Auth | Supabase (Postgres, Auth, Google OAuth) |
| Maps | Leaflet + OpenStreetMap |
| Weather | Open-Meteo (behind a provider interface) |
| Accommodation | Stay22 handoff link only — no booking engine. Constrains seed data, see §9 |
| AI | Single provider behind `AIProvider` interface, template fallback |

**Banned for this build:** Pinecone, Weaviate, Redis, Kafka, Docker Compose stacks, microservices, pgvector, custom model training, native apps, a general chatbot, payment flows, admin dashboards, E2E test infrastructure.

**pgvector and embeddings are explicitly deferred.** Structured extraction alone proves the learning story. Do not reintroduce them.

---

## 4. Shared types — freeze these first

Developer 1 writes `lib/types/index.ts` in the first 20 minutes. **After that it is frozen**; changes require the whole team to agree. Everyone else codes against these immediately, using mocks.

```ts
export type Dimension =
  | 'mountains' | 'beaches' | 'nature' | 'culture'
  | 'food' | 'nightlife' | 'adventure' | 'luxury';

export interface Destination {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  blurb: string;
  attributes: Record<Dimension, number>;   // 0–1
  crowdLevel: number;                      // 0–1, higher = more crowded
  estimatedDailyBudget: number;            // INR
  tags: string[];
}

export type Provenance = 'explicit' | 'behavioral' | 'conversational';

export interface TravelProfile {
  userId: string;
  scores: Record<Dimension, number>;       // 0–1, neutral start = 0.5
  crowdTolerance: number;                  // 0–1, low = avoids crowds
  noveltyPreference: number;
  budgetSensitivity: number;
  typicalDailyBudget: number;
  preferredTripLength: number;
  confidence: Partial<Record<string, number>>;
  provenance: Partial<Record<string, Provenance>>;
  updatedAt: string;
}

export type EventType =
  | 'destination_searched' | 'destination_viewed' | 'destination_saved'
  | 'destination_removed' | 'recommendation_viewed'
  | 'recommendation_accepted' | 'recommendation_rejected'
  | 'itinerary_created' | 'activity_added' | 'activity_removed'
  | 'trip_created' | 'trip_completed' | 'budget_changed'
  | 'place_visited' | 'place_rated' | 'explicit_dislike';

export interface UserEvent {
  id: string;
  userId: string;
  eventType: EventType;
  placeId?: string;
  value?: number;                          // rating, budget amount, dwell ms
  context?: { tripType?: 'solo' | 'friends' | 'family' | 'couple' | 'business' };
  createdAt: string;
}

export interface RecommendationScore {
  preferenceMatch: number;   // all 0–1
  novelty: number;
  budgetMatch: number;
  behaviorMatch: number;
  overall: number;
}

export interface RecommendationResult {
  destination: Destination;
  score: RecommendationScore;
  reasons: Reason[];         // deterministic, engine-generated
  explanation?: string;      // LLM prose, optional
}

export interface Reason {
  signal: string;            // 'saved_spiti', 'stated_dislikes_crowds'
  text: string;              // human-readable, template-generated
  weight: number;
}

export interface Budget {
  tripId: string;
  total: number;
  planned: Record<BudgetCategory, number>;
  spent: Record<BudgetCategory, number>;
}

export type BudgetCategory =
  | 'accommodation' | 'transportation' | 'food' | 'activities' | 'misc';

export interface BudgetDecision {
  affordable: boolean;
  remainingBefore: number;
  remainingAfter: number;
  overspentCategories: { category: BudgetCategory; delta: number }[];
  underspentCategories: { category: BudgetCategory; delta: number }[];
  explanation?: string;      // LLM prose, optional
}

export interface MemberSatisfaction {
  memberId: string;
  name: string;
  satisfaction: number;              // 0–1
  /** The dimension this member gave up the most on, and by how much.
   *  This is what turns a bar chart into a Fairness Receipt. */
  compromisedOn: {
    dimension: Dimension | 'crowdTolerance' | 'budget';
    memberValue: number;             // what they wanted
    destinationValue: number;        // what they get
    gap: number;                     // memberValue − destinationValue
  } | null;
  /** The dimension where this destination serves them best — the trade they get
   *  in exchange. Never show a compromise without the counterpart. */
  wonOn: { dimension: string; fit: number } | null;
}

export interface ConsensusResult {
  destination: Destination;
  groupScore: number;                // fairness-weighted, see §5.5
  naiveScore: number;                // score under a flattened average profile
  average: number;
  minimum: number;
  perMember: MemberSatisfaction[];
  constraintsApplied: string[];
}

export interface WeatherForecast {
  destinationId: string;
  days: { date: string; tempC: number; precipMm: number; code: number }[];
  stale: boolean;            // true when served from fallback
}
```

---

## 5. The engines — exact specifications

All of these live in `lib/engine/`, are pure, and are unit-tested. Constants come from `lib/config/scoring.ts`.

### 5.1 Recommendation score

```
overall =
    0.35 × preferenceMatch
  + 0.25 × novelty
  + 0.25 × budgetMatch
  + 0.15 × behaviorMatch
```

**preferenceMatch** — the user's own scores act as importance weights, so we measure fit on the dimensions they actually care about:

```
dimensionFit = Σ(profile.scores[d] × dest.attributes[d]) / Σ(profile.scores[d])
crowdFit     = 1 − |dest.crowdLevel − profile.crowdTolerance|
preferenceMatch = 0.75 × dimensionFit + 0.25 × crowdFit
```

**novelty** — `1.0` if never visited, `0.15` if visited. No partial credit.

**budgetMatch** — with `dailyAllowance = tripBudget / tripDays` and `ratio = dest.estimatedDailyBudget / dailyAllowance`:

```
ratio ≤ 1 →  0.85 + 0.15 × ratio
ratio > 1 →  max(0, 1 − 2 × (ratio − 1))
```

**behaviorMatch** — build a tag-affinity vector from the event log (weights in §5.2), normalize to 0–1, dot it against the destination's attributes.

**Hard constraints run before scoring** and eliminate candidates outright:
- over budget by more than 40%
- already visited
- **already saved by the user** — Surprise Me promises *"somewhere I've never been."* If the destination the user saved on stage comes back as the recommendation, the framing collapses. Drop saved IDs from the candidate pool.
- explicit user exclusions

Saved destinations still contribute to `behaviorMatch`. They are removed as *candidates*, not as *signals*.

### 5.2 Event weights

```ts
export const EVENT_WEIGHTS: Record<EventType, number> = {
  destination_searched: 1,
  destination_viewed: 2,        // only counts past the dwell threshold
  destination_saved: 3,
  itinerary_created: 4,
  activity_added: 4,
  place_visited: 5,
  place_rated: 8,               // sign follows rating: ≥4 positive, ≤2 negative
  trip_completed: 5,
  destination_removed: -4,
  activity_removed: -4,
  recommendation_rejected: -4,
  explicit_dislike: -8,
  // repeated behavior on the same tag within a session escalates to 10
};
```

### 5.3 Profile update

Exponential move toward a target — bounded to 0–1 by construction, no clamping hacks.

```
target = weight > 0 ? 1 : 0
alpha  = min(ALPHA_MAX, |weight| / 10 × RATE[provenance] × confidence)
next   = current + alpha × (target − current)
```

```ts
export const RATE = { behavioral: 0.5, conversational: 0.6, explicit: 1.0 };
export const ALPHA_MAX = 0.6;
```

Rules:
- Explicit onboarding answers **set** values directly and record `provenance: 'explicit'`.
- A single behavioral event may never overwrite an explicit preference — cap behavioral `alpha` at `0.25` when the existing provenance is `explicit`.
- **Tune `RATE` and `ALPHA_MAX` so the scripted demo (§8) lands near the target profile.** That is legitimate tuning of a real engine, not faking.

### 5.4 Budget

```
remainingBefore = total − Σ spent
remainingAfter  = remainingBefore − activityCost
affordable      = remainingAfter ≥ 0
```

Also compute per-category variance (`spent − planned`) so the explanation can say *"you're over on food but well under on accommodation."* The numbers come from here; the sentence comes from the LLM.

### 5.5 Group consensus

```
satisfaction(member) = preferenceMatch(member.profile, destination)
groupScore = 0.70 × mean(satisfaction) + 0.30 × min(satisfaction)
```

Hard constraints (budget ceiling, dietary, accessibility) filter candidates **before** scoring. Never average the profiles into one synthetic traveler — that is the exact failure mode we're differentiating against.

**Also compute the naive baseline.** Build a flattened average profile, rank with it, and keep the result as `naiveScore` plus the destination it would have picked. This is not dead code — it is the demo (§8). The fairness weighting is invisible unless the judge sees what the alternative produces.

**Compromise detection** — for each member, after scoring:

```
for each dimension d:
  gap[d] = member.profile.scores[d] − destination.attributes[d]
compromisedOn = argmax(gap) where gap > COMPROMISE_THRESHOLD (0.20)
wonOn         = argmin over |gap| where member.profile.scores[d] > 0.6
```

Crowd tolerance uses `|dest.crowdLevel − member.crowdTolerance|`; budget uses the daily-allowance ratio from §5.1. Return `null` for `compromisedOn` when no gap clears the threshold — that member simply got a good trip, and claiming a fake sacrifice is a §2.3 violation.

Every compromise must be shown alongside its `wonOn` counterpart. A receipt that only lists losses reads as an accusation.

---

## 6. AI layer

```ts
export interface AIProvider {
  extractPreferences(input: string): Promise<ExtractedPreferences>;
  explainRecommendation(ctx: RecommendationContext): Promise<string>;
  explainBudget(ctx: BudgetContext): Promise<string>;
  explainConsensus(ctx: ConsensusContext): Promise<string>;
}
```

- Extraction returns **strict JSON only** — no prose, no markdown fences. Validate with Zod; on parse failure, fall back and log.
- Explanation prompts receive **already-computed scores and reasons**. The prompt says: *narrate these facts, add nothing.*
- `TemplateProvider` implements the same interface using the deterministic `Reason[]` array. It is wired in from the start, not added later. If the API key is missing or a call times out at 4s, the template answer renders and the demo continues seamlessly.

Extraction target shape:

```json
{
  "destination": "Manali",
  "sentiment": "positive",
  "liked": ["mountains", "nature"],
  "disliked": ["crowds", "touristy areas"],
  "confidence": 0.92
}
```

---

## 7. Ownership map — do not cross these lines

| Dev | Domain | Owns |
|---|---|---|
| **D1** | Foundation / Data | `lib/types/*`, `lib/db/*`, `lib/data/destinations.ts`, `lib/data/demoUser.ts`, `app/api/events/*`, Supabase schema, RLS, seed scripts, auth |
| **D2** | Intelligence | `lib/engine/recommend.ts`, `lib/engine/profile.ts`, `lib/config/scoring.ts`, `lib/ai/*`, `app/api/recommend/*`, `app/api/extract/*` |
| **D3** | Core UI | `app/(marketing)`, `app/onboarding`, `app/dashboard`, `app/explore`, `app/surprise`, `app/profile`, `components/ui/*`, `components/destination/*`, `components/profile/*`, `styles/tokens.css` |
| **D4** | Budget / Group / Integrations | `lib/engine/budget.ts`, `lib/engine/consensus.ts`, `lib/data/demoGroup.ts`, `lib/providers/weather.ts`, `app/budget`, `app/group`, `components/budget/*`, `components/group/*`, `components/map/*`, all fallback states |

**Merge protocol:** small commits, push every ~20 minutes, PRs to `main`, no long-lived branches. If two people need the same file, the owner makes the edit.

**Unblocking rule:** never wait. Mock the interface, build against it, swap in the real implementation later. D3 must be able to build the entire Surprise Me screen from a hardcoded `RecommendationResult` fixture before D2's engine exists.

---

## 8. The deterministic demo script

Seed this exact story. It must reproduce identically on every run.

**Cold start** — new user, all dimension scores at `0.50`. Onboarding asks exactly 5 questions, no more:
1. Which of these would you take a spontaneous trip to? *(multi-select destination chips)*
2. Which travel styles appeal to you? *(chips: mountains, beaches, culture, food, nightlife, adventure, luxury)*
3. What's your typical trip budget?
4. What pace do you prefer? *(packed / balanced / slow)*
5. What matters most on a trip? *(rank 3)*

**Interaction sequence:**
1. Search "mountain destinations"
2. View Lake Bohinj (dwell past threshold)
3. Save Lake Bohinj
4. Reject a nightlife-heavy destination (Ibiza)
5. Mark a previous Chamonix trip as enjoyed
6. Tell Sage: *"I love mountains but hate crowded tourist areas."*
7. Set budget to $2,000 for 6 days

**Profile evolution — the money moment.** The UI animates the diff:

| Dimension | Before | After |
|---|---|---|
| Mountains | 0.50 | ~0.91 ↑ |
| Nature | 0.50 | ~0.86 ↑ |
| Adventure | 0.50 | ~0.78 ↑ |
| Crowd tolerance | 0.50 | ~0.22 ↓ |
| Nightlife | 0.50 | ~0.18 ↓ |

Header copy: **"Sage learned something about you."**

**Surprise Me** → **Kazbegi, Georgia** wins the ranking with roughly: Preference 91% · Novelty 100% · Budget 94% · Behavior 88% · **Overall 93%**.

The interesting runner-up story, worth narrating out loud: **Chamonix scores high on preference but loses on novelty** (already visited) and on crowd fit. That demonstrates the novelty and crowd terms doing real work rather than the engine simply picking the most mountain-y row.

**Explanation** cites only real signals: the mountain search pattern, the Bohinj save, the enjoyed Chamonix trip, the stated crowd aversion, never having visited the Caucasus, and fit within $2,000.

**Budget Smart** — $2,000 total; accommodation $560, transport $520, food $380, activities $300, misc $140; $100 remaining. Add a glacier hike at $85 → affordable, ~$15 still under budget, with the over/under-by-category context.

**Group Plan — the closing beat, and the one that separates you from the other twelve personalization demos.** Three mock travelers in `lib/data/demoGroup.ts`:

| | Adventure | Food | Nightlife | Crowd tolerance | Budget sensitivity |
|---|---|---|---|---|---|
| Raj | 0.90 | 0.50 | 0.30 | 0.45 | 0.80 |
| Maya | 0.35 | 0.90 | 0.55 | 0.70 | 0.60 |
| Alex | 0.65 | 0.65 | 0.40 | 0.55 | 0.70 |

Run it in **two passes on screen, in this order:**

1. **The naive pass.** Flatten the three into one average traveler and rank. It returns a middling compromise nobody is enthusiastic about — moderate on everything, excellent for no one. Say the line out loud: *"this is what every group planner does, and it's why nobody's happy."*
2. **The fairness pass.** Same candidates, `0.70 × mean + 0.30 × min`. A different destination wins, with a **higher minimum satisfaction** than the naive pick.

Then show the **Fairness Receipt**:

```
Consensus 91%   ·   Everyone above 85%

Raj    94%   gave up:  nothing significant
             got:      adventure 0.90 → 0.88 fit

Maya   88%   gave up:  adventure-heavy days (0.35 wanted, 0.80 here)
             got:      food scene 0.90 → 0.91 fit

Alex   92%   gave up:  nothing significant
             got:      balanced pace across both
```

Seed the destination attributes so **Maya is the visible compromiser and is still above 85%** — that is the whole argument. If everyone lands at 90%+ with no compromise, there's nothing to show and the fairness weighting looks decorative. Tune for one legible trade.

Closing line for the demo: *"Nobody got averaged away. And everyone can see exactly what they traded."*

---

## 9. Seed data

`lib/data/destinations.ts` — **20 destinations, committed to the repo as TypeScript**, not fetched. The DB mirrors it; the file is the fallback and the demo never depends on the network for this.

**Selection criterion: every destination must have dense OTA accommodation inventory**, because Stay22 aggregates Booking / Expedia / Airbnb / Hotels.com listings. A destination with no listings doesn't error — it returns an empty panel, which reads to a judge as a broken integration. Offbeat, permit-gated, or homestay-dominated places are excluded for this reason, not because they're bad recommendations.

Currency is **USD** throughout. The demo audience is in NYC and should follow the budget arithmetic without converting.

| Role in the demo | Destinations |
|---|---|
| **Hero** — quiet mountains, novel, affordable | **Kazbegi (GE)** |
| Mountain alternatives | Lake Bohinj (SI), Bansko (BG), Tromsø (NO) |
| Crowded / expensive mountain foils | Interlaken (CH), Chamonix (FR), Banff (CA) |
| Adventure & nature | Queenstown (NZ), La Fortuna (CR), Reykjavík (IS) |
| Beaches | Paros (GR), Santorini (GR), Tulum (MX) |
| Nightlife foil (the on-stage rejection) | Ibiza (ES) |
| Culture | Kyoto (JP), Porto (PT), Marrakech (MA), Kraków (PL) |
| Food | San Sebastián (ES), Oaxaca (MX) |

```ts
{
  id: 'kazbegi',
  name: 'Kazbegi',
  region: 'Mtskheta-Mtianeti',
  country: 'Georgia',
  lat: 42.6572, lng: 44.6417,
  blurb: 'A Caucasus mountain town under Gergeti Trinity Church, with glacier hikes and almost no crowds.',
  attributes: {
    mountains: 0.96, beaches: 0.02, nature: 0.94, culture: 0.71,
    food: 0.68, nightlife: 0.10, adventure: 0.80, luxury: 0.30,
  },
  crowdLevel: 0.22,
  estimatedDailyBudget: 95,
  tags: ['caucasus', 'hiking', 'offbeat', 'glacier'],
}
```

**Tuning notes for D1 — read before seeding:**

- **Bansko will try to beat Kazbegi.** It is cheaper and similarly quiet. Hold it back with lower `nature` (~0.72) and `culture` (~0.35) so Kazbegi's profile fit stays ahead on the demo profile.
- **Chamonix must score high on preference and still lose.** Give it `mountains ≈ 0.95`, `crowdLevel ≈ 0.68`, `estimatedDailyBudget ≈ 260`. It gets eliminated by novelty (visited) and dragged down by crowd fit — that contrast is the most persuasive 10 seconds of the demo.
- **Ibiza is the rejection target.** `nightlife ≈ 0.97`, `crowdLevel ≈ 0.88`, so rejecting it produces a large, visible profile swing.
- **Lake Bohinj is the save target** and therefore excluded as a Surprise Me candidate (§5.1). It still needs strong mountain/nature values, since it drives `behaviorMatch`.

Ensure genuine spread across every dimension — if changing a preference doesn't visibly reorder results, the dataset is too flat and the demo has no punch. Build the 20 × 8 attribute matrix and eyeball it as a grid before moving on.

**Fallback hero:** if Stay22 inventory for Kazbegi looks thin during integration testing, promote **Lake Bohinj** to hero and move Bohinj's save-target role to **Tromsø**. Slovenia has much denser Booking coverage and is still novel to a US audience.

---

## 10. Group travel — scope boundary

Group is a **P0 feature and the closing demo beat**, but its cost profile is lopsided: the engine is roughly 60 lines, the UI is where an afternoon disappears. Hold this line.

**Build (~45 minutes total):**
- `lib/engine/consensus.ts` — satisfaction, fairness score, naive baseline, compromise detection. Pure functions.
- `lib/data/demoGroup.ts` — three hardcoded travelers, full `TravelProfile` objects.
- `app/group/page.tsx` — one screen: destination card, naive-vs-fair toggle, group score, three satisfaction bars, Fairness Receipt rows.

**Do not build, at any point, for any reason:**
private surveys · invitation or join flows · group auth · realtime sync · Research Inbox · multiple plan variants · Compromise Studio · plan locking · regeneration · version history · per-member private explanations · chat.

All of these are in the original product vision. None of them are in this build. A judge cannot tell the difference between three hardcoded travelers and three invited ones in a 30-second beat — but they can absolutely tell when the group screen is unfinished because someone spent an hour on an invite flow.

**Constraint handling:** hard constraints (budget ceiling, dietary, accessibility) are read from the mock traveler objects and filter candidates before scoring. Surface which ones fired in `constraintsApplied` and render them as chips — it is cheap and it proves the constraint layer exists.

---

## 11. Design system

Theme: **Sage Explorer** — deep forest green, sage, warm ivory, golden amber. All colors as CSS variables in `styles/tokens.css`. **Never hardcode a hex in a component.** Future themes (Midnight Journey, Terra, Alpine) must be a variable swap.

Target feel: intelligent, adventurous, calm, premium, trustworthy, modern.

Should **not** feel like: an enterprise dashboard, a spreadsheet, a ChatGPT wrapper, or a Booking.com clone.

**The interface must look excellent with every photograph removed.** Carry it with typography, spacing, cards, iconography, charts, subtle gradients, motion, hierarchy, micro-interactions, and considered empty states. Images enhance; they never rescue.

Navigation — only ship items with a real screen behind them: Home · Explore · Surprise Me · Budget · Group · Travel Profile.

**Travel DNA** component: compact bars or radials per dimension with trend arrows on change. It exists to prove personalization, not to turn the product into analytics.

Mobile-first and responsive. PWA manifest + icons if time allows; no offline sync.

---

## 12. Failure behavior

| Failure | Behavior |
|---|---|
| AI provider | Deterministic scores render; template explanation shown. No error visible. |
| Weather | Cached/demo forecast with `stale: true`, or the section is omitted. |
| Maps | Destination detail renders fully without the map tile. |
| Supabase | Fall back to seeded local data and in-memory profile. |
| Google OAuth | `/demo` route signs in as the seeded demo user instantly. |
| Stay22 — error, timeout, **or zero results** | Accommodation card hidden entirely; itinerary unaffected. Never render an empty listings panel — an empty panel looks like a broken integration, which is worse than no panel. |

No screen may render an error state during the demo. Every fetch has a timeout, a fallback, and a skeleton.

---

## 13. Priorities

**P0 — the demo does not exist without these**
App runs reliably · polished landing + dashboard · 5-question onboarding · seeded destinations · structured profile · event capture · profile updates · Surprise Me · deterministic ranking · personalized explanation · budget affordability · **group consensus with the naive-vs-fair contrast and Fairness Receipt** (§10).

**P1 — only after every P0 is done**
Maps · weather · richer itinerary · stronger profile visualization · animations · recommendation feedback · trip history.

**P2 — mock or defer, do not build**
RAG · semantic retrieval · group invitations and join flows · realtime collaboration · Compromise Studio · plan variants and version history · full expense management · routing · booking flows · production travel APIs.

**Seed data is D1's first task**, ahead of freezing types. Building the 20 × 8 attribute matrix and tuning it until the hero wins takes 30–40 minutes. If it slips past the first hour it stops being worth doing — in that case keep whatever dataset exists and gate the Stay22 panel to destinations with confirmed inventory.

**Timebox**
`0:00–0:20` scaffold + freeze types · `0:20–1:15` P0 vertical slices in parallel · `1:15–1:45` **integration checkpoint 1 — every screen renders from real engine output, no fixtures** · `1:45–2:45` finish P0 including group · `2:45–3:15` **integration checkpoint 2, feature freeze** · `3:15–3:40` polish + fallback testing · `3:40–4:00` rehearse the demo end-to-end twice.

Checkpoint 1 moved earlier deliberately. With four people and two engines feeding three UI surfaces, a late first integration is the single most likely way this ends as three disconnected screens.

Nothing merges after feature freeze except bug fixes on the demo path.

---

## 14. Testing

Unit-test the four pure engines only. Vitest, no E2E, no mocking frameworks.

- `recommend.ts` — profile A produces the expected ranking; **Kazbegi wins the demo profile**, Chamonix ranks high on preference but loses overall, and saved/visited destinations never appear as candidates.
- `profile.ts` — event X produces the expected delta; explicit preferences resist single behavioral events.
- `budget.ts` — budget + spend + activity produces the correct affordability decision, including the exact boundary.
- `consensus.ts` — three profiles produce the expected satisfactions; a sacrificed member drags the group score below the naive average; `compromisedOn` correctly identifies Maya's dimension and returns `null` for members under the threshold.

---

## 15. Rules for coding agents specifically

- **Ask nothing you can infer from this file.** It is decisive on purpose.
- **Never widen scope.** If asked for a budget bar, build a budget bar — not a budget module with an expense ledger.
- **Never invent data.** No placeholder destinations, no lorem ipsum, no fake user names outside `lib/data/demoUser.ts`.
- **Never disable strict mode or lint rules** to get past an error. Fix the type.
- **Never install a dependency** not already in `package.json` without saying so explicitly and justifying it in one line.
- **State assumptions inline** in the response, not in a separate planning document.
- **When a file has an owner (§7) and you aren't it**, write the change as a diff suggestion instead of applying it.
- **Prefer deleting over abstracting.** Four hours.

---

## 16. Decision framework

| When choosing between | Choose |
|---|---|
| More features / better personalization | **Better personalization** |
| LLM magic / explainable deterministic logic | **Deterministic logic + LLM explanation** |
| Architectural elegance / hackathon reliability | **Reliability** |
| A future feature / polishing the live demo | **Polish the demo** |
| Perfect backend / four devs shipping independently | **Clear boundaries, parallel work** |

---

## 17. The standard

"Hackathon" is not permission to ship something visibly fake. The MVP should be small but **coherent** — it should feel like the first honest version of a real product.

By the end it must demonstrate personalization, memory, calculated intelligence, explainability, financial awareness, social intelligence, and an architecture that could later carry weather, live context, richer itineraries, semantic memory, and location awareness.

> Every interaction becomes a signal. Every trip makes Sage understand the traveler better.