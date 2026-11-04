-- L6 Rating: dated assessments. See docs/adr/0004 (model) and docs/adr/0012 (append-only).
--
-- 1. assessments: one opinion about a game on a date (overall 0 to 10, optional summary and
--    context). Per person and per game, not per copy.
-- 2. assessment_scores: optional per-dimension scores of one assessment.
-- 3. Append-only: owners can read and insert, never update or delete. A correction is a new row.
-- 4. add_assessment(): inserts an assessment and its scores in one transaction.
-- 5. current_ratings: the latest assessment per person and game (security_invoker view).
-- 6. delete_entry(): keeps the game when the person has assessments for it (ADR-0011).
--
-- assessments.game_id is "no action", not "restrict": deleting an account cascades to the
-- person's games and assessments in one statement, and restrict would fail there.
--
-- Rollback (local, no data depends on it yet): drop the view, the function add_assessment, the
-- tables assessment_scores and assessments, and restore delete_entry() from
-- 20261104143330_archive_and_delete_entry.sql. Dropping the tables deletes every rating.

-- 1. assessments -----------------------------------------------------------------------------

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete no action,
  assessed_on date not null default current_date,
  overall numeric(3, 1) not null check (overall >= 0 and overall <= 10),
  summary text check (summary is null or length(summary) <= 500),
  context text check (context is null or context in ('expectation', 'after_play', 'revisit')),
  created_at timestamptz not null default now(),
  -- Lets scores point at (assessment, owner) together, so a score cannot join someone else's
  -- assessment (foreign keys ignore row security).
  unique (id, user_id)
);

create index assessments_user_id_idx on public.assessments (user_id);
create index assessments_game_id_idx on public.assessments (game_id);
create index assessments_latest_idx
  on public.assessments (user_id, game_id, assessed_on desc, created_at desc);

-- 2. assessment_scores -----------------------------------------------------------------------

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assessment_id uuid not null,
  dimension text not null check (length(btrim(dimension)) between 1 and 40),
  score numeric(3, 1) not null check (score >= 0 and score <= 10),
  unique (assessment_id, dimension),
  foreign key (assessment_id, user_id)
    references public.assessments (id, user_id) on delete cascade
);

create index assessment_scores_user_id_idx on public.assessment_scores (user_id);

-- 3. Row security and privileges -------------------------------------------------------------

alter table public.assessments enable row level security;
alter table public.assessment_scores enable row level security;

create policy "owner can read" on public.assessments
  for select to authenticated using ((select auth.uid()) = user_id);

-- The game must be visible to the caller (games row security applies inside the subquery).
create policy "owner can insert" on public.assessments
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.games g where g.id = assessments.game_id)
  );

create policy "owner can read" on public.assessment_scores
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "owner can insert" on public.assessment_scores
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Append-only: no update, no delete, no truncate for the API roles.
revoke all on public.assessments, public.assessment_scores from anon, authenticated;
grant select, insert on public.assessments, public.assessment_scores to authenticated;

-- 4. add_assessment --------------------------------------------------------------------------

create function public.add_assessment(
  p_game_id uuid,
  p_overall numeric,
  p_assessed_on date default current_date,
  p_summary text default null,
  p_context text default null,
  p_scores jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_dimension text;
  v_score text;
begin
  -- One day of slack so a person ahead of UTC can still pick their own "today".
  if p_assessed_on is null
     or p_assessed_on < date '1900-01-01'
     or p_assessed_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'invalid_scores' using errcode = '22023';
  end if;

  insert into public.assessments (game_id, overall, assessed_on, summary, context)
  values (p_game_id, p_overall, p_assessed_on, nullif(btrim(p_summary), ''), p_context)
  returning id into v_id;

  for v_dimension, v_score in select key, value from jsonb_each_text(p_scores) loop
    insert into public.assessment_scores (assessment_id, dimension, score)
    values (v_id, btrim(v_dimension), v_score::numeric);
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.add_assessment(uuid, numeric, date, text, text, jsonb)
  from public, anon;
grant execute on function public.add_assessment(uuid, numeric, date, text, text, jsonb)
  to authenticated;

-- 5. current_ratings -------------------------------------------------------------------------

create view public.current_ratings
with (security_invoker = true) as
select distinct on (user_id, game_id)
  id as assessment_id,
  user_id,
  game_id,
  overall,
  assessed_on,
  context,
  created_at
from public.assessments
order by user_id, game_id, assessed_on desc, created_at desc;

revoke all on public.current_ratings from anon, authenticated;
grant select on public.current_ratings to authenticated;

-- 6. delete_entry keeps a game that has assessments ------------------------------------------

create or replace function public.delete_entry(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_game uuid;
  v_archived timestamptz;
  v_paths jsonb;
  v_result text := 'deleted';
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select game_id, archived_at into v_game, v_archived
  from public.collection_entries
  where id = p_entry_id and user_id = v_user
  for update;
  if not found then
    return jsonb_build_object('result', 'not_found', 'paths', '[]'::jsonb);
  end if;
  if v_archived is null then
    return jsonb_build_object('result', 'not_archived', 'paths', '[]'::jsonb);
  end if;

  -- Ratings belong to the game, not to a copy, so deleting a copy never touches them. A game
  -- that has ratings is kept even when this was its last copy. Plays and journal entries will
  -- need the same check when they exist, and must reference games with "no action" or "restrict".

  -- Lock the game so a copy being added at the same moment either finishes first (and the game
  -- stays) or fails cleanly.
  perform 1 from public.games where id = v_game for update;

  delete from public.collection_entries where id = p_entry_id;

  -- Cover files of the game, read before the rows cascade away.
  select coalesce(jsonb_agg(storage_path), '[]'::jsonb) into v_paths
  from public.game_images
  where game_id = v_game and storage_path is not null;

  delete from public.games g
  where g.id = v_game
    and g.source = 'manual'
    and g.visibility = 'private'
    and g.created_by = v_user
    and not exists (select 1 from public.collection_entries e where e.game_id = g.id)
    and not exists (select 1 from public.game_editions d where d.game_id = g.id)
    and not exists (select 1 from public.assessments a where a.game_id = g.id);
  if found then
    v_result := 'deleted_with_game';
  else
    v_paths := '[]'::jsonb;
  end if;

  return jsonb_build_object('result', v_result, 'paths', v_paths);
end;
$$;
