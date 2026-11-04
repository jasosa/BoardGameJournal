-- L4b Remove from library. See docs/adr/0011.
--
-- 1. collection_entries.archived_at: an archived copy leaves the Library but keeps its status
--    history. Restoring clears it.
-- 2. archive_entry() and restore_entry(): owner only (row security), safe to repeat.
-- 3. delete_entry(): permanent delete of one copy. Only the owner, only a copy that is already
--    archived, and only when nothing is attached to it. Its status history goes with it. If it
--    was the last copy of a private manual game, the game goes too (its cover rows cascade; the
--    server removes the cover files). Public or provider games are never deleted.
--
-- Authenticated users still have no delete privilege on collection_entries: delete_entry() is
-- the only way. No guard trigger is added because the cascade from deleting an account must keep
-- working.
--
-- When plays, assessments or journal entries exist, add their "is anything attached" check to
-- delete_entry() in a new migration. Today there are no such tables.
--
-- Rollback (local, no data depends on it): drop the three functions, then
-- `alter table public.collection_entries drop column archived_at;` (the column grant goes with
-- it). Warning: dropping the column puts every archived copy back in the Library. Permanent
-- deletes cannot be undone except from a backup. Or `npx supabase db reset`.

alter table public.collection_entries add column archived_at timestamptz;

create index collection_entries_archived_idx
  on public.collection_entries (user_id, archived_at);

-- Column-level grant: add archived_at to the editable columns.
grant update (archived_at) on public.collection_entries to authenticated;

-- archive / restore ----------------------------------------------------------------------------

create function public.archive_entry(p_entry_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_found boolean;
begin
  update public.collection_entries
  set archived_at = coalesce(archived_at, now())
  where id = p_entry_id and user_id = (select auth.uid())
  returning true into v_found;
  return coalesce(v_found, false);
end;
$$;

create function public.restore_entry(p_entry_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_found boolean;
begin
  update public.collection_entries
  set archived_at = null
  where id = p_entry_id and user_id = (select auth.uid())
  returning true into v_found;
  return coalesce(v_found, false);
end;
$$;

-- permanent delete -----------------------------------------------------------------------------

-- Returns jsonb {"result", "paths"}. result is 'not_found' (no such copy, or not the caller's),
-- 'not_archived' (it must be archived first), 'deleted' or 'deleted_with_game'. paths lists the
-- stored cover files of a game that was deleted, so the server removes exactly those.
create function public.delete_entry(p_entry_id uuid)
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

  -- Nothing else is attached yet. Add plays, assessments and journal checks here when they exist.
  -- Future tables that point at an entry or a game must use "on delete restrict", never cascade.

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
    and not exists (select 1 from public.game_editions d where d.game_id = g.id);
  if found then
    v_result := 'deleted_with_game';
  else
    v_paths := '[]'::jsonb;
  end if;

  return jsonb_build_object('result', v_result, 'paths', v_paths);
end;
$$;

revoke execute on function public.archive_entry(uuid) from public, anon;
revoke execute on function public.restore_entry(uuid) from public, anon;
revoke execute on function public.delete_entry(uuid) from public, anon;
grant execute on function public.archive_entry(uuid) to authenticated;
grant execute on function public.restore_entry(uuid) to authenticated;
grant execute on function public.delete_entry(uuid) to authenticated;
