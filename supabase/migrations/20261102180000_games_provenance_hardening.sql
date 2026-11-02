-- L5 security review follow-up. Three changes on public.games.
--
-- Rollback (local, no data depends on it): re-create games_year_range and
-- games_description_length as plain checks, drop games_source_external_id_key and
-- re-create it without the source condition, and `grant update on public.games to
-- authenticated`. Or delete this file and run `npx supabase db reset`.

-- 1. The form limits apply to manual games only. A provider can hold older years (BGG uses 0
--    and negative years) and longer descriptions, and an import must not fail on them.
alter table public.games
  drop constraint games_year_range,
  drop constraint games_description_length,
  add constraint games_year_range
    check (source <> 'manual' or year between 1 and 2200),
  add constraint games_description_length
    check (source <> 'manual' or length(description) <= 2000);

-- 2. Provider ids are unique among provider rows only. A user's private manual game can no
--    longer collide with a provider id, or show that another user's private row exists.
drop index public.games_source_external_id_key;
create unique index games_source_external_id_key
  on public.games (source, external_id)
  where external_id is not null and source <> 'manual';

-- 3. Users may change only the fields the app lets them edit. Provenance and bookkeeping
--    columns (source, external_id, source_url, attribution, fetched_at, created_by,
--    visibility, created_at) can no longer be written with direct API calls. RLS still
--    limits which rows a user can update. Add columns here when a feature needs them.
revoke update on public.games from authenticated;
grant update (name, year, min_players, max_players, play_time_min, description, kind)
  on public.games to authenticated;
