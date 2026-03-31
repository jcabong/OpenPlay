import { createClient } from '@supabase/supabase-js'

// ─── Replace these with your Supabase project credentials ───────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'
// ────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/*
──────────────────────────────────────────────
  SUPABASE DATABASE SCHEMA  (run in SQL editor)
──────────────────────────────────────────────

-- Enable RLS
create extension if not exists "uuid-ossp";

-- USERS (mirrors auth.users)
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz default now()
);
alter table public.users enable row level security;
create policy "Users are viewable by everyone" on public.users for select using (true);
create policy "Users can update own profile"   on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile"   on public.users for insert with check (auth.uid() = id);

-- GAMES
create table public.games (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users(id) on delete cascade not null,
  sport       text not null check (sport in ('badminton', 'pickleball')),
  score       text not null,
  location    text,
  result      text check (result in ('win', 'loss', 'draw')),
  created_at  timestamptz default now()
);
alter table public.games enable row level security;
create policy "Games are viewable by everyone" on public.games for select using (true);
create policy "Users can insert own games"     on public.games for insert with check (auth.uid() = user_id);
create policy "Users can update own games"     on public.games for update using (auth.uid() = user_id);

-- GAME PLAYERS (opponents / teammates)
create table public.game_players (
  id          uuid primary key default uuid_generate_v4(),
  game_id     uuid references public.games(id) on delete cascade not null,
  player_name text not null
);
alter table public.game_players enable row level security;
create policy "Game players viewable by everyone" on public.game_players for select using (true);
create policy "Users can insert game players"     on public.game_players for insert with check (true);

-- TRIGGER: auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
*/
