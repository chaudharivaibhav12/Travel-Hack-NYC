create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (user_id, email, display_name, avatar_url)
select id, lower(email), coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'), raw_user_meta_data->>'avatar_url'
from auth.users where email is not null
on conflict (user_id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  updated_at = now();

create or replace function public.sync_auth_user_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, display_name, avatar_url)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (user_id) do update set email = excluded.email, display_name = excluded.display_name,
    avatar_url = excluded.avatar_url, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_profile();

create table if not exists public.group_trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.group_trips(id) on delete cascade,
  inviter_email text not null,
  invitee_email text not null,
  invitee_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trip_id, invitee_email)
);

create index if not exists profiles_email_search_idx on public.profiles (email text_pattern_ops);
create index if not exists group_trip_invites_email_status_idx on public.group_trip_invitations (invitee_email, status);

-- Development compatibility. Enable RLS and authenticated ownership policies before production.
alter table public.profiles disable row level security;
alter table public.group_trip_invitations disable row level security;
