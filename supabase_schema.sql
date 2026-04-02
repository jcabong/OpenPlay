-- ============================================================
--  OpenPlay — Full Supabase Schema
--  Run this in your Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  city         text,
  region       text,
  country      text default 'Philippines',
  bio          text,
  created_at   timestamptz default now()
);

alter table public.users enable row level security;
create policy "Users viewable by everyone"   on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- ─── GAMES ───────────────────────────────────────────────────
create table if not exists public.games (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.users(id) on delete cascade not null,
  sport               text not null check (sport in ('badminton','pickleball','tennis','tabletennis')),
  court_name          text,
  city                text,
  region              text,
  score               text,
  result              text check (result in ('win','loss')),
  intensity           text check (intensity in ('Low','Med','High')),
  mood                text,
  opponent_name       text,
  tagged_opponent_id  uuid references public.users(id),
  created_at          timestamptz default now()
);

alter table public.games enable row level security;
create policy "Games viewable by everyone"  on public.games for select using (true);
create policy "Users can insert own games"  on public.games for insert with check (auth.uid() = user_id);
create policy "Users can update own games"  on public.games for update using (auth.uid() = user_id);
create policy "Users can delete own games"  on public.games for delete using (auth.uid() = user_id);

-- ─── POSTS ───────────────────────────────────────────────────
create table if not exists public.posts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.users(id) on delete cascade not null,
  content       text,
  sport         text,
  location_name text,
  city          text,
  region        text,
  media_urls    text[] default '{}',
  media_types   text[] default '{}',   -- 'image' | 'video'
  game_id       uuid references public.games(id),
  inserted_at   timestamptz default now()
);

alter table public.posts enable row level security;
create policy "Posts viewable by everyone"  on public.posts for select using (true);
create policy "Users can insert own posts"  on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts"  on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts"  on public.posts for delete using (auth.uid() = user_id);

-- ─── LIKES ───────────────────────────────────────────────────
create table if not exists public.likes (
  id       uuid primary key default uuid_generate_v4(),
  post_id  uuid references public.posts(id) on delete cascade not null,
  user_id  uuid references public.users(id) on delete cascade not null,
  unique(post_id, user_id)
);

alter table public.likes enable row level security;
create policy "Likes viewable by everyone"  on public.likes for select using (true);
create policy "Users can insert own likes"  on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes"  on public.likes for delete using (auth.uid() = user_id);

-- ─── COMMENTS ────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid references public.posts(id) on delete cascade not null,
  user_id    uuid references public.users(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;
create policy "Comments viewable by everyone"    on public.comments for select using (true);
create policy "Users can insert own comments"    on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments"    on public.comments for delete using (auth.uid() = user_id);

-- ─── EVENTS ──────────────────────────────────────────────────
create table if not exists public.events (
  id           uuid primary key default uuid_generate_v4(),
  host_id      uuid references public.users(id) on delete cascade not null,
  title        text not null,
  description  text,
  sport        text not null check (sport in ('badminton','pickleball','tennis','tabletennis','multi')),
  event_type   text not null check (event_type in ('tournament','open_play','clinic')),
  venue        text,
  city         text,
  region       text,
  country      text default 'Philippines',
  date_start   timestamptz not null,
  date_end     timestamptz,
  max_slots    int default 32,
  fee          numeric default 0,
  cover_url    text,
  is_published boolean default true,
  created_at   timestamptz default now()
);

alter table public.events enable row level security;
create policy "Events viewable by everyone"   on public.events for select using (true);
create policy "Users can insert own events"   on public.events for insert with check (auth.uid() = host_id);
create policy "Users can update own events"   on public.events for update using (auth.uid() = host_id);
create policy "Users can delete own events"   on public.events for delete using (auth.uid() = host_id);

-- ─── EVENT REGISTRATIONS ─────────────────────────────────────
create table if not exists public.event_registrations (
  id         uuid primary key default uuid_generate_v4(),
  event_id   uuid references public.events(id) on delete cascade not null,
  user_id    uuid references public.users(id) on delete cascade not null,
  status     text default 'confirmed' check (status in ('confirmed','waitlist','cancelled')),
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table public.event_registrations enable row level security;
create policy "Registrations viewable by everyone"  on public.event_registrations for select using (true);
create policy "Users can register"                  on public.event_registrations for insert with check (auth.uid() = user_id);
create policy "Users can cancel own registration"   on public.event_registrations for delete using (auth.uid() = user_id);

-- ─── TRIGGER: auto-create user profile on sign-up ────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── STORAGE BUCKET for media ────────────────────────────────
-- Run in Supabase Dashboard → Storage → New bucket
-- Name: "openplay-media", Public: true
-- Or via SQL:
-- insert into storage.buckets (id, name, public) values ('openplay-media', 'openplay-media', true)
-- on conflict do nothing;
