-- Fix: the preferences_* tables already existed (created earlier from an
-- original draft schema that had no uniqueness constraint), so
-- 002_preferences.sql's `CREATE TABLE IF NOT EXISTS` silently no-op'd and
-- never added it. POST /preferences/* upserts via `ON CONFLICT (member_id,
-- trip_id)`, which needs a real UNIQUE (or exclusion) constraint on exactly
-- those columns to target — hence "no unique or exclusion constraint
-- matching the ON CONFLICT specification" (Postgres 42P10).
--
-- Safe to re-run. Each block only adds the constraint if it's missing.
-- Will fail if a table already has duplicate (member_id, trip_id) rows —
-- unlikely here since the upsert has never successfully run yet, but if it
-- does fail, tell me and I'll write the de-dupe step first.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'preferences_travel_member_trip_key'
  ) THEN
    ALTER TABLE preferences_travel
      ADD CONSTRAINT preferences_travel_member_trip_key UNIQUE (member_id, trip_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'preferences_stay_member_trip_key'
  ) THEN
    ALTER TABLE preferences_stay
      ADD CONSTRAINT preferences_stay_member_trip_key UNIQUE (member_id, trip_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'preferences_food_member_trip_key'
  ) THEN
    ALTER TABLE preferences_food
      ADD CONSTRAINT preferences_food_member_trip_key UNIQUE (member_id, trip_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'preferences_activities_member_trip_key'
  ) THEN
    ALTER TABLE preferences_activities
      ADD CONSTRAINT preferences_activities_member_trip_key UNIQUE (member_id, trip_id);
  END IF;
END $$;
