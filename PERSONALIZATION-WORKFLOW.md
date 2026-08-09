# PERSONALIZATION-WORKFLOW.md — Sage Adventurer

How activity data gets from a click into Supabase, out again as a profile, and
into a recommendation. Companion to `MasterPrompt.md`; where they disagree,
MasterPrompt wins.

**Owner: D1** (schema, RLS, `lib/db/*`, `app/api/events/*`).
**Consumer: D2** (`lib/engine/*`, `app/api/recommend/*`).
D3/D4 only call the client helper in §3.1.

---

## 0. The shape of it

```
  click / dwell / rating / free text
            │
            ▼
   trackEvent()  ── optimistic local profile update (UI never waits)
            │
            ▼
   POST /api/events  ── Zod validate, resolve weight server-side
            │
            ├──► INSERT user_events            (append-only, the truth)
            ├──► applyEvent() pure TS  ──► UPSERT travel_profiles
            └──► bumpAffinity()        ──► UPSERT tag_affinity, activity_affinity
            │
            ▼
   returns { profile, deltas }  ── UI animates "Sage learned something about you"


   GET /api/recommend
            │
            ▼
   getRecommendationInputs(userId)  ── ONE parallel read
            │  { profile, tagAffinity, activityAffinity, saved, visited, excluded }
            ▼
   rankDestinations() / rankActivities()  ── pure, deterministic, no I/O
            ▼
   RecommendationResult[] + Reason[]  ──► LLM narrates, adds nothing
```

Two rules hold the whole thing together:

1. **`user_events` is append-only and is the only source of truth.** Every other
   personalization table is a cache that can be rebuilt from it.
2. **Nothing in `lib/engine/*` touches Supabase.** The route handler does the
   I/O, hands plain objects to pure functions, and writes the result back.

---

## 1. Schema

All of this goes in one migration. Run it first — D2, D3, D4 are blocked on the
table names, not on the data.

```sql
-- ─────────────────────────────────────────────────────────────
-- 1.1 Catalog (mirrors lib/data/destinations.ts — the TS file
--     stays the fallback, per MasterPrompt §9)
-- ─────────────────────────────────────────────────────────────
create table public.destinations (
  id                     text primary key,
  name                   text not null,
  region                 text,
  country                text,
  lat                    double precision,
  lng                    double precision,
  blurb                  text,
  attributes             jsonb  not null,          -- Record<Dimension, number> 0–1
  crowd_level            real   not null,
  estimated_daily_budget integer not null,         -- USD
  tags                   text[] not null default '{}'
);
create index destinations_tags_idx on public.destinations using gin (tags);

-- Activity-level catalog. This is what makes "recommend similar activities"
-- possible rather than only "recommend similar places".
create table public.activities (
  id               text primary key,
  destination_id   text references public.destinations(id) on delete cascade,
  name             text not null,
  category         text not null,   -- 'hike'|'museum'|'food_tour'|'nightlife'|'spa'|'viewpoint'|…
  attributes       jsonb not null,  -- same 8 Dimensions, 0–1
  tags             text[] not null default '{}',
  cost             integer,         -- USD
  duration_minutes integer
);
create index activities_dest_idx on public.activities (destination_id);
create index activities_tags_idx on public.activities using gin (tags);

-- ─────────────────────────────────────────────────────────────
-- 1.2 The event log — append-only, never UPDATE, never DELETE
-- ─────────────────────────────────────────────────────────────
create table public.user_events (
  id           uuid primary key,                      -- CLIENT-generated (idempotency)
  user_id      uuid not null references auth.users(id) on delete cascade,
  event_type   text not null,
  place_id     text references public.destinations(id),
  activity_id  text references public.activities(id),
  value        real,                                  -- rating | amount | dwell ms
  context      jsonb,                                 -- { tripType, source, query }
  session_id   uuid,                                  -- drives §2.3 escalation
  weight       real not null,                         -- resolved SERVER-side
  created_at   timestamptz not null default now()
);
create index user_events_user_time_idx on public.user_events (user_id, created_at desc);
create index user_events_user_type_idx on public.user_events (user_id, event_type);

-- ─────────────────────────────────────────────────────────────
-- 1.3 Derived state — all rebuildable from user_events
-- ─────────────────────────────────────────────────────────────
create table public.travel_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  scores               jsonb   not null,   -- Record<Dimension, number>, neutral start 0.5
  crowd_tolerance      real    not null default 0.5,
  novelty_preference   real    not null default 0.5,
  budget_sensitivity   real    not null default 0.5,
  typical_daily_budget integer not null default 150,
  preferred_trip_length integer not null default 5,
  confidence           jsonb   not null default '{}',
  provenance           jsonb   not null default '{}',
  events_applied       integer not null default 0,    -- watermark; detects drift
  updated_at           timestamptz not null default now()
);

create table public.tag_affinity (
  user_id     uuid not null references auth.users(id) on delete cascade,
  tag         text not null,
  score       real not null default 0,      -- running weighted sum, unnormalized
  event_count integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, tag)
);

create table public.activity_affinity (
  user_id     uuid not null references auth.users(id) on delete cascade,
  category    text not null,
  score       real not null default 0,
  event_count integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, category)
);

-- Saved / visited / excluded. Denormalized from the log because §5.1 hard
-- constraints need it as a fast set lookup on every ranking call.
create table public.user_destinations (
  user_id        uuid not null references auth.users(id) on delete cascade,
  destination_id text not null references public.destinations(id) on delete cascade,
  relation       text not null check (relation in ('saved','visited','excluded')),
  rating         smallint check (rating between 1 and 5),
  created_at     timestamptz not null default now(),
  primary key (user_id, destination_id, relation)
);

-- ─────────────────────────────────────────────────────────────
-- 1.4 RLS — on for every user-scoped table, one policy shape
-- ─────────────────────────────────────────────────────────────
alter table public.user_events       enable row level security;
alter table public.travel_profiles   enable row level security;
alter table public.tag_affinity      enable row level security;
alter table public.activity_affinity enable row level security;
alter table public.user_destinations enable row level security;

create policy own_rows on public.user_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- repeat verbatim for the other four tables.

-- Catalog is world-readable, nobody writes it from the client.
alter table public.destinations enable row level security;
alter table public.activities   enable row level security;
create policy read_all on public.destinations for select using (true);
create policy read_all on public.activities   for select using (true);
```

**Why `id` is client-generated:** React strict mode double-fires effects, and a
dwell timer can fire twice on a fast back-navigation. A client UUID plus the
primary key turns a duplicate POST into a no-op instead of a doubled profile
swing. Insert with `on conflict (id) do nothing`.

**Why `weight` is stored:** so a replay is a pure fold with no lookup, and so
retuning `EVENT_WEIGHTS` mid-hackathon doesn't silently rewrite history. Store
what was applied.

---

## 2. Write path

### 2.1 Client helper — the only thing D3/D4 call

```ts
// lib/db/track.ts  (client-safe, no secrets)
export async function trackEvent(input: TrackInput): Promise<void> {
  const event = { ...input, id: crypto.randomUUID(), sessionId: getSessionId() };

  applyOptimistic(event);          // Zustand/context — UI updates immediately

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));
    reconcile(await res.json());   // server profile wins
  } catch {
    queueLocally(event);           // localStorage, retried on next flush
  }
}
```

Fire-and-forget. **No screen ever awaits a track call** — MasterPrompt §12.

### 2.2 Route handler — `app/api/events/route.ts` (D1)

```ts
1. Zod-parse the body. Reject unknown event_type.
2. weight = EVENT_WEIGHTS[event_type]                    // server-side, never trusted from client
3. Apply the dwell gate: destination_viewed with value < DWELL_MS_THRESHOLD → weight 0.
4. Apply the sign rule: place_rated → weight = value >= 4 ? +8 : value <= 2 ? -8 : 0
5. Apply session escalation (§2.3).
6. INSERT user_events ... on conflict (id) do nothing.
     If 0 rows inserted → duplicate → return the current profile unchanged. Stop.
7. Read: current travel_profiles row + the destination/activity row.
8. const { next, deltas } = applyEvent(current, event, catalogRow)   // PURE, lib/engine/profile.ts
9. UPSERT travel_profiles (events_applied + 1).
10. UPSERT tag_affinity / activity_affinity for every tag on the catalog row.
11. Maintain user_destinations for saved / visited / excluded / removed.
12. Return { profile: next, deltas }.
```

Steps 6–11 go in one Postgres transaction (`supabase.rpc('record_event', …)`
wrapping plain inserts, or a single `pg` transaction). If you can't get a
transaction working in the time you have, order it 6 → 9 → 10 → 11 so the
append-only log is always ahead of the caches; a rebuild fixes any tear.

### 2.3 Session escalation

MasterPrompt §5.2: *repeated behavior on the same tag within a session escalates
to 10.* Implement it here, not in the engine:

```sql
select count(*) from user_events e
join destinations d on d.id = e.place_id
where e.user_id = $1 and e.session_id = $2 and d.tags && $3::text[] and e.weight > 0;
```

Third or later positive hit on an overlapping tag within the same `session_id`
→ `weight = 10`. This is what makes the scripted demo (search mountains → view
Bohinj → save Bohinj) move the mountains score decisively instead of nudging it.

### 2.4 What gets tracked where

| Surface | Event | Payload notes |
|---|---|---|
| Explore search box | `destination_searched` | `context.query`, no `place_id` |
| Destination card in view >2.5s | `destination_viewed` | `value` = dwell ms; IntersectionObserver + timer, fires on unmount |
| Save button | `destination_saved` | also writes `user_destinations` |
| Unsave | `destination_removed` | |
| Surprise Me accept / reject | `recommendation_accepted` / `_rejected` | Ibiza rejection lives here |
| Add activity to itinerary | `activity_added` | **`activity_id` set** — this is the activity-level signal |
| Remove activity | `activity_removed` | |
| Past-trip "I enjoyed this" | `place_visited` + `place_rated` | Chamonix beat |
| Free-text box | `explicit_dislike` / dimension sets | via `/api/extract`, provenance `conversational` |
| Budget slider commit | `budget_changed` | `value` = total; updates `typical_daily_budget` |
| Onboarding answers | direct profile set | provenance `explicit`, **not** an event fold |

Onboarding is the one exception: §5.3 says explicit answers *set* values
directly. Still write the events for the audit trail, but with `weight 0` so a
replay doesn't double-count them.

---

## 3. Read path

### 3.1 One function, one round trip

```ts
// lib/db/personalization.ts  (server only)
export async function getRecommendationInputs(userId: string): Promise<Inputs> {
  const [profile, tags, cats, rels, dests, acts] = await Promise.all([
    sb.from('travel_profiles').select('*').eq('user_id', userId).maybeSingle(),
    sb.from('tag_affinity').select('tag,score,event_count').eq('user_id', userId),
    sb.from('activity_affinity').select('category,score,event_count').eq('user_id', userId),
    sb.from('user_destinations').select('destination_id,relation,rating').eq('user_id', userId),
    sb.from('destinations').select('*'),
    sb.from('activities').select('*'),
  ]);
  // Any rejection → fall back to lib/data/* + neutral profile. Never throw.
}
```

Normalize `tag_affinity.score` to 0–1 here (divide by the max absolute score in
the set) so the engine receives clean 0–1 vectors and stays free of
normalization concerns.

Then:

```ts
const ranked = rankDestinations(inputs);   // pure, seeded, no Math.random()
```

### 3.2 Answering "what kind of activities does this person do"

This is the query you actually asked for. It reads straight off the log and
needs no extra machinery:

```sql
-- Top tags by weighted signal
select t.tag,
       sum(e.weight)                          as score,
       count(*)                               as touches,
       max(e.created_at)                      as last_seen
from   public.user_events e
join   public.destinations d on d.id = e.place_id
cross  join lateral unnest(d.tags) as t(tag)
where  e.user_id = $1 and e.weight <> 0
group  by t.tag
order  by score desc;
```

```sql
-- Top activity categories — 'this person books hikes and viewpoints,
-- never nightlife'
select a.category,
       sum(e.weight)  as score,
       count(*)       as touches
from   public.user_events e
join   public.activities a on a.id = e.activity_id
where  e.user_id = $1
group  by a.category
order  by score desc;
```

```sql
-- Revealed budget: what they actually plan at, not what they claim
select percentile_cont(0.5) within group (order by e.value) as median_budget
from   public.user_events e
where  e.user_id = $1 and e.event_type = 'budget_changed';
```

Both affinity tables are just these queries materialized so the hot path doesn't
run them. Keep the SQL — it is the debugging view and the "show me what Sage
knows" panel.

### 3.3 Recommending similar activities

```ts
rankActivities({
  activityAffinity,          // category → 0–1
  tagAffinity,               // tag → 0–1
  profile,                   // 8 dimensions, for the same preferenceMatch math
  destinationId,             // scope to the trip being planned
  remainingBudget,           // from lib/engine/budget.ts
}): ActivityRecommendation[]
```

Same weighting shape as §5.1 so there's one mental model:
`0.35 × dimensionFit + 0.25 × categoryAffinity + 0.25 × budgetFit + 0.15 × tagOverlap`.
Reuse the `Reason[]` machinery verbatim — "you added two glacier hikes in
Kazbegi" is a real, citable signal and satisfies §2.3.

---

## 4. Replay — the safety net

```ts
// lib/engine/profile.ts — pure, no I/O
export function replayProfile(events: UserEvent[], catalog: Catalog): TravelProfile {
  return events
    .sort(byCreatedAt)
    .reduce((p, e) => applyEvent(p, e, catalog).next, neutralProfile());
}
```

Three uses:

1. **Unit tests (§14).** Feed the §8 interaction sequence, assert mountains
   ≈0.91, crowd tolerance ≈0.22. This is how you tune `RATE` and `ALPHA_MAX`
   without clicking through the UI thirty times.
2. **`POST /api/profile/rebuild`** (dev only). Recomputes profile + both affinity
   tables from the log. Your undo button if a bad weight tune corrupts state
   twenty minutes before the demo.
3. **Drift check.** If `events_applied` ≠ `count(user_events where weight <> 0)`,
   a write tore. Rebuild silently.

Because `weight` is stored on the row, replay is deterministic and identical
every run — which is exactly what §2.5 demands of the hero path.

---

## 5. Fallback ladder

| Failure | Behavior |
|---|---|
| `POST /api/events` fails | Optimistic local profile already applied. Event queued in localStorage, flushed on next success. UI shows nothing. |
| Supabase read fails on recommend | `lib/data/destinations.ts` + in-memory profile from the local event queue. Ranking still runs; Kazbegi still wins. |
| No auth session | `/demo` seeds the demo user's profile and events in memory. Full demo path works signed out. |
| Profile row missing | `neutralProfile()` — all dimensions 0.5. Never 500. |
| Affinity tables empty | `behaviorMatch` contributes 0.5 (neutral), not 0. A cold user must not be penalized. |

Seed the demo user's events into Supabase at build time so the "Sage learned
something about you" diff has real history behind it even on a cold laptop.

---

## 6. Build order (D1)

| Time | Task | Unblocks |
|---|---|---|
| 0:00–0:15 | Migration §1, RLS, push | everyone |
| 0:15–0:45 | Seed `destinations` + `activities` from the TS files | D2 ranking, D4 budget |
| 0:45–1:05 | `POST /api/events` steps 1–6 (log only, no profile math) | D3 can wire every button now |
| 1:05–1:30 | Steps 7–11 with D2's `applyEvent` | the profile diff animation |
| 1:30–1:45 | `getRecommendationInputs` | D2's recommend route |
| 1:45–2:00 | Replay + rebuild route + demo-user seed | tuning and the safety net |

Ship step 6 before step 7. A working append-only log with no profile math is
useful to three other people; a half-finished profile updater is useful to
nobody.

---

## 7. Explicitly not building

pgvector · embeddings · semantic similarity · a recommendations cache table ·
event batching/debounce beyond the dwell gate · cross-user collaborative
filtering · analytics dashboards · GDPR export · soft deletes.

`user_events` at hackathon volume is a few hundred rows. Query it directly.
