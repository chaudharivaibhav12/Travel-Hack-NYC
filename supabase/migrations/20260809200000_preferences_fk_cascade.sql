-- The original preferences migration (backend/sql/002_preferences.sql)
-- specified ON DELETE CASCADE on every preferences_* foreign key, but the
-- live database has ON DELETE NO ACTION instead (confirmed via direct
-- introspection against information_schema — see DECISIONS.md). Deleting a
-- trip or member right now fails with a foreign-key violation instead of
-- cleanly cascading, which is the opposite of what was intended.
--
-- Only the preferences_* tables are touched here: they're the ones with a
-- documented CASCADE intent. members.trip_id -> trips.id has no such
-- documentation anywhere in the repo (members predates any tracked
-- migration), so its behavior is left as-is rather than guessed at.

ALTER TABLE ONLY "public"."preferences_travel"
    DROP CONSTRAINT "preferences_travel_member_id_fkey",
    ADD CONSTRAINT "preferences_travel_member_id_fkey"
        FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."preferences_travel"
    DROP CONSTRAINT "preferences_travel_trip_id_fkey",
    ADD CONSTRAINT "preferences_travel_trip_id_fkey"
        FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."preferences_stay"
    DROP CONSTRAINT "preferences_stay_member_id_fkey",
    ADD CONSTRAINT "preferences_stay_member_id_fkey"
        FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."preferences_stay"
    DROP CONSTRAINT "preferences_stay_trip_id_fkey",
    ADD CONSTRAINT "preferences_stay_trip_id_fkey"
        FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."preferences_food"
    DROP CONSTRAINT "preferences_food_member_id_fkey",
    ADD CONSTRAINT "preferences_food_member_id_fkey"
        FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."preferences_food"
    DROP CONSTRAINT "preferences_food_trip_id_fkey",
    ADD CONSTRAINT "preferences_food_trip_id_fkey"
        FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."preferences_activities"
    DROP CONSTRAINT "preferences_activities_member_id_fkey",
    ADD CONSTRAINT "preferences_activities_member_id_fkey"
        FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."preferences_activities"
    DROP CONSTRAINT "preferences_activities_trip_id_fkey",
    ADD CONSTRAINT "preferences_activities_trip_id_fkey"
        FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;
