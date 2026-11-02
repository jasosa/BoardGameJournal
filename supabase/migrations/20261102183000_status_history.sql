-- L3: every collection status change is kept, with a date. See docs/adr/0009.
--
-- The history table is append-only: people can read their own rows and nothing else. Rows are
-- written by exactly two things: a trigger that records the first status of a new entry, and
-- change_entry_status(), which changes the status and writes the row in one transaction.
-- Updating collection_entries.status directly is no longer allowed, so it cannot skip the history.
--
-- Rollback (local, no data depends on it): grant update on public.collection_entries to
-- authenticated; drop function public.change_entry_status(uuid, text, date); drop trigger
-- collection_entries_first_status on public.collection_entries; drop function
-- public.log_first_status(); drop table public.collection_status_changes. Or `npx supabase db reset`.

create table public.collection_status_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.collection_entries(id) on delete cascade,
  -- Null for the first row of an entry.
  from_status text
    check (from_status in ('owned', 'wishlist', 'interested', 'previously_owned')),
  to_status text not null
    check (to_status in ('owned', 'wishlist', 'interested', 'previously_owned')),
  -- The date the person says the change happened. recorded_at is when it was logged.
  changed_on date not null check (changed_on >= date '1900-01-01'),
  recorded_at timestamptz not null default now(),
  check (from_status is distinct from to_status)
);

create index collection_status_changes_entry_idx
  on public.collection_status_changes (entry_id, changed_on desc, recorded_at desc);
create index collection_status_changes_user_id_idx
  on public.collection_status_changes (user_id);

alter table public.collection_status_changes enable row level security;

create policy "owner can read" on public.collection_status_changes
  for select to authenticated using ((select auth.uid()) = user_id);
-- No insert, update or delete policies, and no privileges for them either (below).

revoke all on public.collection_status_changes from anon, authenticated;
grant select on public.collection_status_changes to authenticated;

-- First row of every new entry.
create function public.log_first_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.collection_status_changes
    (user_id, entry_id, from_status, to_status, changed_on)
  values (new.user_id, new.id, null, new.status, current_date);
  return new;
end;
$$;

revoke execute on function public.log_first_status() from public, anon, authenticated;

create trigger collection_entries_first_status
  after insert on public.collection_entries
  for each row execute function public.log_first_status();

-- The only way to change a status. Runs with the owner's rights, so it checks the caller itself:
-- the entry must belong to auth.uid(). Returns the new status, or null when there is no such
-- entry for the caller. Setting the status the entry already has changes nothing.
create function public.change_entry_status(
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
  -- One day of slack so a person ahead of UTC can still pick their own "today".
  if p_changed_on is null
     or p_changed_on < date '1900-01-01'
     or p_changed_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;

  -- Locks the row, so two quick changes are recorded one after the other.
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

  -- The check constraint on status rejects unknown values here.
  update public.collection_entries set status = p_status where id = p_entry_id;
  insert into public.collection_status_changes
    (user_id, entry_id, from_status, to_status, changed_on)
  values (v_user, p_entry_id, v_old, p_status, p_changed_on);
  return p_status;
end;
$$;

revoke execute on function public.change_entry_status(uuid, text, date) from public, anon;
grant execute on function public.change_entry_status(uuid, text, date) to authenticated;

-- Status can no longer be updated directly. Other columns still can.
revoke update on public.collection_entries from authenticated;
grant update (edition_id, acquired_on, sold_on, price, currency, source, notes)
  on public.collection_entries to authenticated;

-- Existing entries get a first row from their creation date. Earlier changes were never
-- recorded, so none are invented.
insert into public.collection_status_changes
  (user_id, entry_id, from_status, to_status, changed_on)
select user_id, id, null, status, created_at::date
from public.collection_entries;
