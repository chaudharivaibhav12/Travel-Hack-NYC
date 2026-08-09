-- Run this in Supabase Dashboard > SQL Editor

-- Group trips (title, destination, dates, invited members)
create table if not exists public.group_trips (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  destination    text not null,
  checkin        date not null,
  checkout       date not null,
  organizer_email text not null,
  organizer_user_id uuid,
  invited_emails text[] default '{}',
  status         text default 'survey-open',
  created_at     timestamptz default now()
);

-- Per-member private survey responses (linked to group_trips by trip_id)
create table if not exists public.member_surveys (
  id                       uuid primary key default gen_random_uuid(),
  trip_id                  uuid references public.group_trips(id) on delete cascade not null,
  user_email               text not null,
  user_id                  uuid,
  -- availability
  arrival_date             date,
  arrival_time             text,
  departure_date           date,
  departure_time           text,
  join_full_trip           boolean default true,
  fixed_commitments        text,
  schedule_note            text,
  -- budget
  budget_band              text,
  budget_flexibility       text,
  spending_priorities      text[] default '{}',
  accommodation_preference text,
  room_preference          text,
  bathroom_preference      text,
  optional_cost_preference text,
  -- pace & logistics
  daily_pace               text,
  preferred_start_time     text,
  walking_tolerance        text,
  transport_preference     text,
  free_time_need           text,
  group_style_preference   text,
  -- food, comfort, accessibility
  dietary_preferences      text,
  alcohol_preference       text,
  accessibility_needs      text[] default '{}',
  sensory_preferences      text[] default '{}',
  -- interests
  interests                text[] default '{}',
  must_do                  text,
  cannot_do                text[] default '{}',
  -- metadata
  completed_at             timestamptz,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),
  unique(trip_id, user_email)
);

-- Generated itineraries (one row per member per trip)
create table if not exists public.itineraries (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references public.group_trips(id) on delete cascade not null,
  member_email text not null,
  content      jsonb not null,
  created_at   timestamptz default now(),
  unique(trip_id, member_email)
);

-- Disable RLS for development (re-enable with proper policies before prod)
alter table public.group_trips disable row level security;
alter table public.member_surveys disable row level security;
alter table public.itineraries disable row level security;
