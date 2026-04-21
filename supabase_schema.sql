-- ============================================================
--  OpenPlay — Full Supabase Schema (WITH CHECKS) v2
--  Run this in your Supabase SQL Editor
--  Safe to re-run — uses IF NOT EXISTS / ON CONFLICT
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────
do $$ begin
  create table if not exists public.users (
    id           uuid primary key references auth.users(id) on delete cascade,
    username     text unique,
    display_name text,
    avatar_url   text,
    avatar_type  text default 'initials',
    city         text,
    region       text,
    province     text,
    country      text default 'Philippines',
    bio          text,
    total_wins   integer default 0,
    total_xp     integer default 0,
    trust_score  integer default 100,
    deleted_matches_count integer default 0,
    role         text default 'user',
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
  );
exception when others then null;
end $$;

-- Add avatar_type column if it doesn't exist (migration safety)
do $$ begin
  alter table public.users add column if not exists avatar_type text default 'initials';
exception when others then null;
end $$;

-- Add province column to users if missing
do $$ begin
  alter table public.users add column if not exists province text;
exception when others then null;
end $$;

alter table public.users enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'Users viewable by everyone') then
    create policy "Users viewable by everyone" on public.users for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);
  end if;
end $$;

-- ─── GAMES ───────────────────────────────────────────────────
-- Fix: sport constraint updated to match all 4 sports used in the UI
-- Previously may have had 'squash' or 'padel' — removing those
do $$ begin
  create table if not exists public.games (
    id                  uuid primary key default uuid_generate_v4(),
    user_id             uuid references public.users(id) on delete cascade not null,
    sport               text not null check (sport in ('badminton','pickleball','tennis','tabletennis')),
    court_name          text,
    city                text,
    province            text,
    score               text,
    result              text check (result in ('win','loss')),
    intensity           text check (intensity in ('Low','Med','High')),
    mood                text,
    opponent_name       text,
    tagged_opponent_id  uuid references public.users(id),
    created_at          timestamptz default now(),
    edited_at           timestamptz,
    is_deleted          boolean default false,
    deleted_at          timestamptz,
    deleted_by          uuid references public.users(id),
    disputed            boolean default false,
    dispute_reason      text,
    disputed_by         uuid references public.users(id),
    disputed_at         timestamptz,
    resolved_by         uuid references public.users(id),
    resolution_status   text,
    resolution_note     text,
    edit_deadline       timestamptz
  );
exception when others then null;
end $$;

alter table public.games enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'games' and policyname = 'Games viewable by everyone') then
    create policy "Games viewable by everyone" on public.games for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'games' and policyname = 'Games insert by authenticated') then
    create policy "Games insert by authenticated" on public.games for insert with check (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'games' and policyname = 'Users can update own games') then
    create policy "Users can update own games" on public.games for update using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'games' and policyname = 'Users can delete own games') then
    create policy "Users can delete own games" on public.games for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── POSTS ───────────────────────────────────────────────────
do $$ begin
  create table if not exists public.posts (
    id              uuid primary key default uuid_generate_v4(),
    author_id       uuid references public.users(id) on delete cascade,
    user_id         uuid references public.users(id) on delete cascade not null,
    content         text,
    sport           text,
    location_name   text,
    city            text,
    province        text,
    media_urls      text[] default '{}',
    media_types     text[] default '{}',
    game_id         uuid references public.games(id),
    -- Fix: add created_at so ordering always works (inserted_at also kept for compat)
    created_at      timestamptz default now(),
    inserted_at     timestamptz default now(),
    edited_at       timestamptz,
    is_deleted      boolean default false,
    mentions        text[]
  );
exception when others then null;
end $$;

-- Migration: add created_at if missing from existing tables
do $$ begin
  alter table public.posts add column if not exists created_at timestamptz default now();
exception when others then null;
end $$;

alter table public.posts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'posts' and policyname = 'Posts viewable by everyone') then
    create policy "Posts viewable by everyone" on public.posts for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'posts' and policyname = 'Users can insert own posts') then
    create policy "Users can insert own posts" on public.posts for insert with check (auth.uid() = author_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'posts' and policyname = 'Users can update own posts') then
    create policy "Users can update own posts" on public.posts for update using (auth.uid() = author_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'posts' and policyname = 'Users can delete own posts') then
    create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = author_id);
  end if;
end $$;

-- ─── LIKES ───────────────────────────────────────────────────
do $$ begin
  create table if not exists public.likes (
    id       uuid primary key default uuid_generate_v4(),
    post_id  uuid references public.posts(id) on delete cascade not null,
    user_id  uuid references public.users(id) on delete cascade not null,
    unique(post_id, user_id)
  );
exception when others then null;
end $$;

alter table public.likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'likes' and policyname = 'Likes viewable by everyone') then
    create policy "Likes viewable by everyone" on public.likes for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'likes' and policyname = 'Users can insert own likes') then
    create policy "Users can insert own likes" on public.likes for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'likes' and policyname = 'Users can delete own likes') then
    create policy "Users can delete own likes" on public.likes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── COMMENTS ────────────────────────────────────────────────
do $$ begin
  create table if not exists public.comments (
    id         uuid primary key default uuid_generate_v4(),
    post_id    uuid references public.posts(id) on delete cascade not null,
    user_id    uuid references public.users(id) on delete cascade not null,
    content    text not null,
    created_at timestamptz default now()
  );
exception when others then null;
end $$;

alter table public.comments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'Comments viewable by everyone') then
    create policy "Comments viewable by everyone" on public.comments for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'Users can insert own comments') then
    create policy "Users can insert own comments" on public.comments for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comments' and policyname = 'Users can delete own comments') then
    create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── COMMENT LIKES ───────────────────────────────────────────
-- Fix: was missing from original schema but referenced in PostCard.jsx
do $$ begin
  create table if not exists public.comment_likes (
    id         uuid primary key default uuid_generate_v4(),
    comment_id uuid references public.comments(id) on delete cascade not null,
    user_id    uuid references public.users(id) on delete cascade not null,
    unique(comment_id, user_id)
  );
exception when others then null;
end $$;

alter table public.comment_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comment_likes' and policyname = 'Comment likes viewable by everyone') then
    create policy "Comment likes viewable by everyone" on public.comment_likes for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comment_likes' and policyname = 'Users can manage own comment likes') then
    create policy "Users can manage own comment likes" on public.comment_likes for all using (auth.uid() = user_id);
  end if;
end $$;

-- ─── COMMENT REPLIES ─────────────────────────────────────────
-- Fix: was missing from original schema but referenced in PostCard.jsx
do $$ begin
  create table if not exists public.comment_replies (
    id         uuid primary key default uuid_generate_v4(),
    comment_id uuid references public.comments(id) on delete cascade not null,
    user_id    uuid references public.users(id) on delete cascade not null,
    content    text not null,
    created_at timestamptz default now()
  );
exception when others then null;
end $$;

alter table public.comment_replies enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comment_replies' and policyname = 'Comment replies viewable by everyone') then
    create policy "Comment replies viewable by everyone" on public.comment_replies for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'comment_replies' and policyname = 'Users can manage own replies') then
    create policy "Users can manage own replies" on public.comment_replies for all using (auth.uid() = user_id);
  end if;
end $$;

-- ─── NOTIFICATIONS ───────────────────────────────────────────
-- Fix: original schema used 'read' column but code uses 'is_read' — add both for safety
do $$ begin
  create table if not exists public.notifications (
    id         uuid primary key default uuid_generate_v4(),
    user_id    uuid references public.users(id) on delete cascade not null,
    type       text,
    title      text,
    body       text,
    is_read    boolean default false,
    read       boolean default false,    -- legacy alias, keep for compat
    data       jsonb,
    created_at timestamptz default now()
  );
exception when others then null;
end $$;

-- Migration: add is_read if missing
do $$ begin
  alter table public.notifications add column if not exists is_read boolean default false;
exception when others then null;
end $$;

alter table public.notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can view own notifications') then
    create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can insert notifications') then
    create policy "Users can insert notifications" on public.notifications for insert with check (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can update own notifications') then
    create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
  end if;
end $$;

-- ─── EVENTS ──────────────────────────────────────────────────
do $$ begin
  create table if not exists public.events (
    id           uuid primary key default uuid_generate_v4(),
    host_id      uuid references public.users(id) on delete cascade not null,
    title        text not null,
    description  text,
    sport        text,
    event_type   text check (event_type in ('tournament','open_play','clinic')),
    venue        text,
    city         text,
    date_start   timestamptz,
    date_end     timestamptz,
    max_slots    integer default 32,
    fee          numeric default 0,
    is_published boolean default true,
    created_at   timestamptz default now()
  );
exception when others then null;
end $$;

alter table public.events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Events viewable by everyone') then
    create policy "Events viewable by everyone" on public.events for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Authenticated users can create events') then
    create policy "Authenticated users can create events" on public.events for insert with check (auth.uid() = host_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Hosts can update own events') then
    create policy "Hosts can update own events" on public.events for update using (auth.uid() = host_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Hosts can delete own events') then
    create policy "Hosts can delete own events" on public.events for delete using (auth.uid() = host_id);
  end if;
end $$;

-- ─── EVENT REGISTRATIONS ─────────────────────────────────────
do $$ begin
  create table if not exists public.event_registrations (
    id         uuid primary key default uuid_generate_v4(),
    event_id   uuid references public.events(id) on delete cascade not null,
    user_id    uuid references public.users(id) on delete cascade not null,
    status     text default 'confirmed',
    created_at timestamptz default now(),
    unique(event_id, user_id)
  );
exception when others then null;
end $$;

alter table public.event_registrations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'event_registrations' and policyname = 'Registrations viewable by everyone') then
    create policy "Registrations viewable by everyone" on public.event_registrations for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'event_registrations' and policyname = 'Users can manage own registrations') then
    create policy "Users can manage own registrations" on public.event_registrations for all using (auth.uid() = user_id);
  end if;
end $$;

-- ─── GAME AUDIT LOG ──────────────────────────────────────────
do $$ begin
  create table if not exists public.game_audit_log (
    id         uuid primary key default uuid_generate_v4(),
    game_id    uuid references public.games(id) on delete cascade,
    user_id    uuid references public.users(id),
    action     text,
    old_data   jsonb,
    new_data   jsonb,
    reason     text,
    timestamp  timestamptz default now()
  );
exception when others then null;
end $$;

alter table public.game_audit_log enable row level security;

-- Admins can read all audit logs
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'game_audit_log' and policyname = 'Admins can view audit logs') then
    create policy "Admins can view audit logs" on public.game_audit_log for select
      using (
        exists (
          select 1 from public.users
          where id = auth.uid() and role = 'admin'
        )
      );
  end if;
end $$;

-- ─── TRIGGERS & FUNCTIONS ────────────────────────────────────

-- Auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, username, display_name, avatar_url, avatar_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'initials'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Set edit deadline on game creation
create or replace function public.set_edit_deadline()
returns trigger language plpgsql as $$
begin
  new.edit_deadline = new.created_at + interval '24 hours';
  return new;
end;
$$;

drop trigger if exists set_edit_deadline_trigger on public.games;
create trigger set_edit_deadline_trigger
  before insert on public.games
  for each row execute procedure public.set_edit_deadline();

-- Update trust score on soft-delete
create or replace function public.update_trust_score_on_delete()
returns trigger language plpgsql as $$
begin
  if new.is_deleted = true and (old.is_deleted = false or old.is_deleted is null) then
    update public.users 
    set 
      deleted_matches_count = deleted_matches_count + 1,
      trust_score = greatest(0, trust_score - 10)
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists track_deletions_trigger on public.games;
create trigger track_deletions_trigger
  after update on public.games
  for each row
  when (old.is_deleted = false and new.is_deleted = true)
  execute procedure public.update_trust_score_on_delete();

-- ─── STORAGE BUCKET ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('openplay-media', 'openplay-media', true)
on conflict (id) do nothing;

-- Storage policies
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Authenticated users can upload media'
  ) then
    create policy "Authenticated users can upload media"
      on storage.objects for insert
      with check (auth.role() = 'authenticated' and bucket_id = 'openplay-media');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Media is publicly readable'
  ) then
    create policy "Media is publicly readable"
      on storage.objects for select
      using (bucket_id = 'openplay-media');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users can delete own media'
  ) then
    create policy "Users can delete own media"
      on storage.objects for delete
      using (auth.uid()::text = (storage.foldername(name))[1] and bucket_id = 'openplay-media');
  end if;
end $$;

-- ─── USEFUL INDEXES ──────────────────────────────────────────
create index if not exists idx_games_user_id on public.games(user_id);
create index if not exists idx_games_sport on public.games(sport);
create index if not exists idx_games_is_deleted on public.games(is_deleted);
create index if not exists idx_games_tagged_opponent on public.games(tagged_opponent_id);
create index if not exists idx_posts_author_id on public.posts(author_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_posts_is_deleted on public.posts(is_deleted);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
create index if not exists idx_likes_post_id on public.likes(post_id);
create index if not exists idx_comments_post_id on public.comments(post_id);
