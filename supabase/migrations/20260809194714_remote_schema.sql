


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid",
    "user_id" "uuid",
    "name" "text",
    "email" "text",
    "avatar" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preferences_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "trip_id" "uuid",
    "interests" "text"[],
    "pace" "text",
    "must_sees" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."preferences_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preferences_food" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "trip_id" "uuid",
    "cuisines" "text"[],
    "dietary" "text"[],
    "meal_budget" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."preferences_food" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preferences_stay" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "trip_id" "uuid",
    "budget_min" integer,
    "budget_max" integer,
    "property_types" "text"[],
    "vibes" "text"[],
    "needs" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."preferences_stay" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preferences_travel" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "trip_id" "uuid",
    "origin_city" "text",
    "origin_airport" "text",
    "departure_date" "date",
    "return_date" "date",
    "flight_budget" integer,
    "departure_time_pref" "text",
    "date_flexibility" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."preferences_travel" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text",
    "destination_name" "text",
    "event_location" "text",
    "lat" double precision,
    "lng" double precision,
    "checkin" "date",
    "checkout" "date",
    "created_by" "uuid",
    "group_size" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preferences_activities"
    ADD CONSTRAINT "preferences_activities_member_trip_key" UNIQUE ("member_id", "trip_id");



ALTER TABLE ONLY "public"."preferences_activities"
    ADD CONSTRAINT "preferences_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preferences_food"
    ADD CONSTRAINT "preferences_food_member_trip_key" UNIQUE ("member_id", "trip_id");



ALTER TABLE ONLY "public"."preferences_food"
    ADD CONSTRAINT "preferences_food_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preferences_stay"
    ADD CONSTRAINT "preferences_stay_member_trip_key" UNIQUE ("member_id", "trip_id");



ALTER TABLE ONLY "public"."preferences_stay"
    ADD CONSTRAINT "preferences_stay_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preferences_travel"
    ADD CONSTRAINT "preferences_travel_member_trip_key" UNIQUE ("member_id", "trip_id");



ALTER TABLE ONLY "public"."preferences_travel"
    ADD CONSTRAINT "preferences_travel_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");



ALTER TABLE ONLY "public"."preferences_activities"
    ADD CONSTRAINT "preferences_activities_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."preferences_activities"
    ADD CONSTRAINT "preferences_activities_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");



ALTER TABLE ONLY "public"."preferences_food"
    ADD CONSTRAINT "preferences_food_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."preferences_food"
    ADD CONSTRAINT "preferences_food_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");



ALTER TABLE ONLY "public"."preferences_stay"
    ADD CONSTRAINT "preferences_stay_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."preferences_stay"
    ADD CONSTRAINT "preferences_stay_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");



ALTER TABLE ONLY "public"."preferences_travel"
    ADD CONSTRAINT "preferences_travel_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."preferences_travel"
    ADD CONSTRAINT "preferences_travel_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."preferences_activities" TO "anon";
GRANT ALL ON TABLE "public"."preferences_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."preferences_activities" TO "service_role";



GRANT ALL ON TABLE "public"."preferences_food" TO "anon";
GRANT ALL ON TABLE "public"."preferences_food" TO "authenticated";
GRANT ALL ON TABLE "public"."preferences_food" TO "service_role";



GRANT ALL ON TABLE "public"."preferences_stay" TO "anon";
GRANT ALL ON TABLE "public"."preferences_stay" TO "authenticated";
GRANT ALL ON TABLE "public"."preferences_stay" TO "service_role";



GRANT ALL ON TABLE "public"."preferences_travel" TO "anon";
GRANT ALL ON TABLE "public"."preferences_travel" TO "authenticated";
GRANT ALL ON TABLE "public"."preferences_travel" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































