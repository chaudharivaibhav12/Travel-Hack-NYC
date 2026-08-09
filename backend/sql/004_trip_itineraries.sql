-- Generated itineraries for the existing private /trips flow.
CREATE TABLE IF NOT EXISTS trip_itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by uuid,
  content jsonb NOT NULL,
  provider text NOT NULL,
  model text,
  prompt_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_itineraries_trip_created_idx
  ON trip_itineraries (trip_id, created_at DESC);

-- Hackathon demo policy, consistent with the existing private-trip tables.
-- Replace with authenticated owner/member policies before production.
ALTER TABLE trip_itineraries DISABLE ROW LEVEL SECURITY;
