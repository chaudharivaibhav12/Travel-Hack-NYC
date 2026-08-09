-- GroupGo: preferences tables
-- Run once in Supabase → SQL editor. Safe to re-run (IF NOT EXISTS guards).
--
-- members already has exactly {id, trip_id, user_id, name, email, avatar},
-- all nullable except id — someone already applied that simplification, so
-- there's nothing to alter there. This file only adds the preferences_*
-- tables the per-category forms write to.

-- Preferences tables. One row per member per trip per category — the
-- UNIQUE constraint is what makes POST /preferences/* an upsert (fill in
-- once, edit later, same row).

CREATE TABLE IF NOT EXISTS preferences_travel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  origin_city text,
  origin_airport text,
  departure_date date,
  return_date date,
  flight_budget integer,
  departure_time_pref text,   -- 'any' | 'morning' | 'afternoon' | 'evening'
  date_flexibility text,      -- 'exact' | '1day' | '3days' | 'flexible'
  created_at timestamptz DEFAULT now(),
  UNIQUE (member_id, trip_id)
);

CREATE TABLE IF NOT EXISTS preferences_stay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  budget_min integer,
  budget_max integer,
  property_types text[],      -- ['hotel','apartment','hostel','villa','cabin']
  vibes text[],                -- ['modern','cozy','boutique','budget','luxury']
  needs text[],                -- ['private_room','free_cancellation','near_transit','good_reviews']
  created_at timestamptz DEFAULT now(),
  UNIQUE (member_id, trip_id)
);

CREATE TABLE IF NOT EXISTS preferences_food (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  cuisines text[],
  dietary text[],              -- ['vegetarian','vegan','halal','gluten_free','none']
  meal_budget text,            -- 'budget' | 'mid' | 'splurge'
  created_at timestamptz DEFAULT now(),
  UNIQUE (member_id, trip_id)
);

CREATE TABLE IF NOT EXISTS preferences_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  interests text[],            -- ['markets','museums','nightlife','nature','shopping','hidden_gems','architecture','beaches']
  pace text,                   -- 'relaxed' | 'moderate' | 'packed'
  must_sees text,              -- free text
  created_at timestamptz DEFAULT now(),
  UNIQUE (member_id, trip_id)
);

-- Hackathon demo: RLS off, matching trips/members.
ALTER TABLE preferences_travel DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferences_stay DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferences_food DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferences_activities DISABLE ROW LEVEL SECURITY;
