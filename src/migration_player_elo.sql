-- ── player_elo table ─────────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor if player_elo doesn't exist yet

create table if not exists player_elo (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  sport           text not null,
  elo_rating      integer not null default 1000,
  wins            integer not null default 0,
  losses          integer not null default 0,
  matches_played  integer not null default 0,
  skill_tier      text not null default 'Bronze',
  updated_at      timestamptz not null default now(),
  unique (user_id, sport)
);

-- Enable RLS
alter table player_elo enable row level security;

-- Public read
create policy "Anyone can read player_elo"
  on player_elo for select using (true);

-- Authenticated users can insert/update their own (via service role in prod)
create policy "Authenticated can upsert player_elo"
  on player_elo for insert with check (auth.uid() is not null);

create policy "Authenticated can update player_elo"
  on player_elo for update using (auth.uid() is not null);

-- Index for fast leaderboard queries
create index if not exists idx_player_elo_sport_rating on player_elo(sport, elo_rating desc);
create index if not exists idx_player_elo_user_id      on player_elo(user_id);

-- ── Reputation columns on users table ────────────────────────────────────────
-- Add if they don't exist (safe to run multiple times via IF NOT EXISTS workaround)

do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name = 'users' and column_name = 'avg_skill') then
    alter table users
      add column avg_skill         numeric(3,2) default 0,
      add column avg_sportsmanship numeric(3,2) default 0,
      add column avg_reliability   numeric(3,2) default 0,
      add column rating_count      integer      default 0;
  end if;
end $$;

-- ── elo_rating and skill_tier on users (for quick profile display) ────────────
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_name = 'users' and column_name = 'elo_rating') then
    alter table users
      add column elo_rating  integer default 1000,
      add column skill_tier  text    default 'Bronze';
  end if;
end $$;
