import { createClient } from '@supabase/supabase-js'

/**
 * SUPABASE CONFIGURATION
 * * Instructions:
 * 1. Replace 'YOUR_PROJECT_URL' with your actual Supabase project URL.
 * 2. The Anon Key is already set to the key you provided.
 * 3. For Vercel, ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Environment Variables.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_URL.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NVx4QNDYxLUtRgjDuW6Jqw_uZ8xDVKD'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/*
──────────────────────────────────────────────────────────────────────────────
  FULL DATABASE OVERHAUL SQL (Run this in Supabase SQL Editor)
  This fixes the "tagged_opponent_id" error and enables the Feed/Socials.
──────────────────────────────────────────────────────────────────────────────

-- 1. SETUP EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. USERS TABLE (The core profile)
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- 3. GAMES TABLE (The match history & stats)
create table if not exists public.games (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.users(id) on delete cascade not null,
  sport               text not null check (sport in ('tennis', 'pickleball', 'badminton', 'golf', 'tabletennis')),
  score               text not null,
  court_name          text,
  result              text check (result in ('win', 'loss', 'draw')),
  opponent_name       text,
  tagged_opponent_id  uuid references public.users(id),
  created_at          timestamptz default now()
);

-- 4. POSTS TABLE (The Global Feed / Network)
create table if not exists public.posts (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references public.users(id) on delete cascade not null,
  content        text not null,
  sport          text,
  location_name  text,
  inserted_at    timestamptz default now()
);

-- 5. SOCIAL INTERACTIONS (Likes & Comments)
create table if not exists public.likes (
  id       uuid primary key default uuid_generate_v4(),
  post_id  uuid references public.posts(id) on delete cascade,
  user_id  uuid references public.users(id) on delete cascade,
  unique(post_id, user_id)
);

create table if not exists public.comments (
  id           uuid primary key default uuid_generate_v4(),
  post_id      uuid references public.posts(id) on delete cascade,
  user_id      uuid references public.users(id) on delete cascade,
  content      text not null,
  inserted_at  timestamptz default now()
);

-- 6. SECURITY POLICIES (Fixes "Missing Feed" issues)
alter table public.users enable row level security;
alter table public.games enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- Allow public viewing for a social experience
create policy "Public users access" on public.users for select using (true);
create policy "Public games access" on public.games for select using (true);
create policy "Public posts access" on public.posts for select using (true);
create policy "Public likes access" on public.likes for select using (true);
create policy "Public comments access" on public.comments for select using (true);

-- Allow users to manage their own data
create policy "Users manage own games" on public.games for all using (auth.uid() = user_id);
create policy "Users manage own posts" on public.posts for all using (auth.uid() = user_id);
create policy "Users manage own likes" on public.likes for all using (auth.uid() = user_id);

-- 7. TRIGGER: Auto-create Profile on Sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. THE CACHE FIX (Run this whenever you see 'column not found' errors)
notify pgrst, 'reload schema';
*/
