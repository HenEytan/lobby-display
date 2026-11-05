-- Superseded by Upstash Redis (api/state.js): kept for a deployment that stays on Supabase.
-- lobby-display — Supabase schema for its OWN project (it used to share PeakLook's production one).
-- Run once in the new project's SQL editor, then set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
-- Vercel and remove SUPABASE_ANON_KEY.
--
-- api/state.js is the only reader and writer, with the service key, which bypasses RLS. RLS is on
-- with NO policies, so the anon key (public by design) can neither read the stored PIN nor write
-- past the PIN check.

create table if not exists public.lobby_state (
  id         text        primary key,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.lobby_state enable row level security;

-- Moving the row from the old project: export it there
--   select id, data, updated_at from public.lobby_state;
-- and insert it here. `lobby_display_state` was never read by the code; it is not recreated.
