-- L7 Thoughts: journal_entries. See docs/adr/0013.
--
-- A thought is free text (light Markdown, ADR-0005) about a game, marked with none, one or several
-- topics (parts of the game). It is the first use of journal_entries from docs/ARCHITECTURE.md;
-- plays, campaigns and tone get their own columns later.
--
-- Unlike ratings, thoughts are editable and deletable by their owner (text the person wrote, not a
-- history record). Only body and topics can be changed; written_on stays.
--
-- game_id is "no action" (ADR-0011 rule): a game that has thoughts is never deleted with its last
-- copy, and account deletion still cascades. delete_entry() is replaced to keep such a game.
--
-- Rollback (local): drop the table journal_entries and the function topics_valid(), and restore
-- delete_entry() from 20261104172750_assessments.sql. Dropping the table deletes every thought,
-- so export them first.

-- 1. Topic names ---------------------------------------------------------------------------------

-- The nine topics of the screen, no duplicates. A function because a check cannot hold a subquery.
create function public.topics_valid(p_topics text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_topics is not null
    and p_topics <@ array[
      'mechanics', 'theme', 'artwork', 'components', 'production',
      'replayability', 'solo mode', 'interaction', 'combat'
    ]::text[]
    and (select count(distinct t) from unnest(p_topics) as t) = cardinality(p_topics);
$$;

-- 2. journal_entries -----------------------------------------------------------------------------

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete no action,
  body text not null check (length(btrim(body)) between 1 and 10000),
  topics text[] not null default '{}' check (public.topics_valid(topics)),
  written_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journal_entries_user_id_idx on public.journal_entries (user_id);
create index journal_entries_game_id_idx on public.journal_entries (game_id);
create index journal_entries_latest_idx
  on public.journal_entries (user_id, game_id, written_on desc, created_at desc);

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- A direct insert cannot use a far date or choose created_at. Same range as ratings and statuses.
create function public.guard_journal_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.written_on < date '1900-01-01' or new.written_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger journal_entries_guard_insert
  before insert on public.journal_entries
  for each row execute function public.guard_journal_insert();

-- 3. Row security and privileges -----------------------------------------------------------------

alter table public.journal_entries enable row level security;

create policy "owner can read" on public.journal_entries
  for select to authenticated using ((select auth.uid()) = user_id);

-- The game must be visible to the caller (games row security applies inside the subquery).
create policy "owner can insert" on public.journal_entries
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.games g where g.id = journal_entries.game_id)
  );

create policy "owner can update" on public.journal_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner can delete" on public.journal_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Only the text and the topics can change after writing.
revoke all on public.journal_entries from anon, authenticated;
grant select, insert, delete on public.journal_entries to authenticated;
grant update (body, topics) on public.journal_entries to authenticated;

-- 4. add_thought ---------------------------------------------------------------------------------

create function public.add_thought(
  p_game_id uuid,
  p_body text,
  p_topics text[] default '{}',
  p_written_on date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- One day of slack so a person ahead of UTC can still pick their own "today".
  if p_written_on is null
     or p_written_on < date '1900-01-01'
     or p_written_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;

  insert into public.journal_entries (game_id, body, topics, written_on)
  values (p_game_id, btrim(p_body), coalesce(p_topics, '{}'), p_written_on)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.add_thought(uuid, text, text[], date) from public, anon;
grant execute on function public.add_thought(uuid, text, text[], date) to authenticated;

-- 5. delete_entry keeps a game that has thoughts -------------------------------------------------

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

  -- Ratings and thoughts belong to the game, not to a copy, so deleting a copy never touches
  -- them. A game that has either is kept even when this was its last copy. Plays will need the
  -- same check, and must reference games with "no action" or "restrict".

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
    and not exists (select 1 from public.assessments a where a.game_id = g.id)
    and not exists (select 1 from public.journal_entries j where j.game_id = g.id);
  if found then
    v_result := 'deleted_with_game';
  else
    v_paths := '[]'::jsonb;
  end if;

  return jsonb_build_object('result', v_result, 'paths', v_paths);
end;
$$;
