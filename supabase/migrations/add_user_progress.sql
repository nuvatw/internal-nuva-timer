-- ─── user_progress table ─────────────────────
-- Run this in the Supabase SQL editor.
-- Tracks XP, levels, daily focus stats, and tomatoes per user.

create table if not exists user_progress (
  user_id        uuid references auth.users primary key,
  total_xp       integer not null default 0,
  current_level  integer not null default 1,

  -- Daily counters (reset when daily_date changes)
  daily_focus_minutes  integer not null default 0,
  daily_tomatoes       integer not null default 0,
  daily_xp             integer not null default 0,
  daily_date           date    not null default current_date,

  -- Configurable goal
  tomato_goal          integer not null default 20,

  -- Streak tracking
  current_streak     integer not null default 0,
  longest_streak     integer not null default 0,
  last_session_date  date,

  -- Lifetime stats
  sessions_completed   integer not null default 0,
  total_focus_minutes  integer not null default 0,

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── Row-Level Security ─────────────────────

alter table user_progress enable row level security;

create policy "Users can read own progress"
  on user_progress for select
  using (auth.uid() = user_id);

create policy "Service role can manage progress"
  on user_progress for all
  using (true);
