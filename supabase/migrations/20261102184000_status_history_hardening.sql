-- L3 security review follow-up. See docs/adr/0009.
--
-- 1. The first history row takes the date the person gives when adding a game (their local
--    "today"), not the server's UTC date.
-- 2. A status can only change inside change_entry_status(), even for roles that bypass row
--    security (service role, postgres): a guard trigger refuses any other status change.
-- 3. Authenticated users can no longer delete collection entries through the API, because a
--    delete would remove the entry's history with it. There is no "remove from collection"
--    feature yet; its design must decide what happens to the history (see STATUS open questions).
-- 4. set_updated_at() is no longer executable by everyone.
--
-- Rollback (local, no data depends on it): drop the guard trigger and function; restore the
-- previous log_first_status(), change_entry_status() and add_manual_game(text, text) from
-- 20261102124840 and 20261102183000; grant delete on public.collection_entries to authenticated.
-- Or `npx supabase db reset`.

-- 1. Date of the first row -------------------------------------------------------------------

create or replace function public.log_first_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added text := nullif(current_setting('app.added_on', true), '');
begin
  insert into public.collection_status_changes
    (user_id, entry_id, from_status, to_status, changed_on)
  values (new.user_id, new.id, null, new.status, coalesce(v_added::date, current_date));
  -- Used once: a later insert in the same transaction must not reuse it.
  perform set_config('app.added_on', '', true);
  return new;
end;
$$;

-- add_manual_game gets an optional date. The signature changes, so the old one is replaced.
drop function public.add_manual_game(text, text);

create function public.add_manual_game(
  p_title text,
  p_status text,
  p_added_on date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_game_id uuid;
  v_entry_id uuid;
begin
  -- One day of slack so a person ahead of UTC can still pick their own "today".
  if p_added_on is null
     or p_added_on < date '1900-01-01'
     or p_added_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;

  insert into public.games (name, source)
  values (btrim(p_title), 'manual')
  returning id into v_game_id;

  -- Read by log_first_status() for the first history row of this entry.
  perform set_config('app.added_on', p_added_on::text, true);

  insert into public.collection_entries (game_id, status)
  values (v_game_id, p_status)
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke execute on function public.add_manual_game(text, text, date) from public, anon;
grant execute on function public.add_manual_game(text, text, date) to authenticated;

-- 2. Status changes only through change_entry_status() ----------------------------------------

create function public.guard_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.status_change', true), '') <> 'on' then
    raise exception 'status_change_via_function_only' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger collection_entries_guard_status
  before update of status on public.collection_entries
  for each row execute function public.guard_status_change();

-- change_entry_status() raises the flag for its own update only.
create or replace function public.change_entry_status(
  p_entry_id uuid,
  p_status text,
  p_changed_on date default current_date
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_old text;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_changed_on is null
     or p_changed_on < date '1900-01-01'
     or p_changed_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;

  select status into v_old
  from public.collection_entries
  where id = p_entry_id and user_id = v_user
  for update;
  if not found then
    return null;
  end if;
  if v_old = p_status then
    return v_old;
  end if;

  perform set_config('app.status_change', 'on', true);
  update public.collection_entries set status = p_status where id = p_entry_id;
  perform set_config('app.status_change', '', true);

  insert into public.collection_status_changes
    (user_id, entry_id, from_status, to_status, changed_on)
  values (v_user, p_entry_id, v_old, p_status, p_changed_on);
  return p_status;
end;
$$;

-- 3. No deleting entries through the API ------------------------------------------------------

revoke delete on public.collection_entries from authenticated;

-- 4. Tidy ------------------------------------------------------------------------------------

revoke execute on function public.set_updated_at() from public, anon, authenticated;
