-- Duplicate warning slice: add another copy of a game the person already has.
--
-- add_game_copy() creates a collection entry on an EXISTING game. It runs as the caller
-- (security invoker), so RLS decides everything: the "owner can insert" policy already
-- requires that the game is visible to the caller. It uses the same date rules and the same
-- app.added_on mechanism as add_manual_game(), so the first history row carries the date the
-- person gives. L2 (provider search) reuses it to add a provider game that already exists.
--
-- Rollback (nothing depends on it): drop function public.add_game_copy(uuid, text, date);
-- Dropping it leaves the entries it already created in place.
-- Or `npx supabase db reset`.

create function public.add_game_copy(
  p_game_id uuid,
  p_status text,
  p_added_on date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry_id uuid;
begin
  -- One day of slack so a person ahead of UTC can still pick their own "today".
  if p_added_on is null
     or p_added_on < date '1900-01-01'
     or p_added_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;

  -- Read by log_first_status() for the first history row of this entry.
  perform set_config('app.added_on', p_added_on::text, true);

  insert into public.collection_entries (game_id, status)
  values (p_game_id, p_status)
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke execute on function public.add_game_copy(uuid, text, date) from public, anon;
grant execute on function public.add_game_copy(uuid, text, date) to authenticated;
