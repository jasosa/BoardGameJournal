-- L8: import an exported file into an empty account (ADR-0014).
--
-- import_account(p_data jsonb) writes a whole export in ONE transaction, for the signed-in user
-- only (auth.uid(), never a value from the file). It is security definer because it has to write
-- history rows and keep the file's timestamps, which direct inserts are not allowed to do. It
-- raises the transaction-local flag app.import, and three triggers honour it:
--   - log_first_status()        skips its automatic first history row (the file has the history)
--   - guard_assessment_insert() keeps the file's created_at
--   - guard_journal_insert()    keeps the file's created_at and updated_at
-- Everything else in those triggers stays as it was, including the date range checks. The flag
-- is set and cleared inside the function. No API call can set it, because the API exposes
-- functions, not set_config().
--
-- No new table and no new column.
--
-- Rollback (nothing depends on it): drop function public.import_account(jsonb); then restore the
-- three trigger functions from 20261102184000 (log_first_status), 20261104173829
-- (guard_assessment_insert) and 20261104192422 (guard_journal_insert). Data already imported
-- stays, because it is ordinary rows. Or `npx supabase db reset`.

-- 1. Three trigger functions learn the flag ----------------------------------------------------

create or replace function public.log_first_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added text := nullif(current_setting('app.added_on', true), '');
begin
  -- An import supplies the whole history itself.
  if coalesce(current_setting('app.import', true), '') = 'on' then
    return new;
  end if;
  insert into public.collection_status_changes
    (user_id, entry_id, from_status, to_status, changed_on)
  values (new.user_id, new.id, null, new.status, coalesce(v_added::date, current_date));
  perform set_config('app.added_on', '', true);
  return new;
end;
$$;

create or replace function public.guard_assessment_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assessed_on < date '1900-01-01' or new.assessed_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;
  if coalesce(current_setting('app.import', true), '') <> 'on' then
    new.created_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.guard_journal_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.written_on < date '1900-01-01' or new.written_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;
  if coalesce(current_setting('app.import', true), '') <> 'on' then
    new.created_at := now();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- 2. The import --------------------------------------------------------------------------------

create function public.import_account(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_game jsonb;
  v_copy jsonb;
  v_step jsonb;
  v_item jsonb;
  v_game_id uuid;
  v_entry_id uuid;
  v_prev text;
  v_overall numeric;
  v_games int := 0;
  v_copies int := 0;
  v_archived int := 0;
  v_changes int := 0;
  v_ratings int := 0;
  v_thoughts int := 0;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  if p_data is null
     or jsonb_typeof(p_data) <> 'object'
     or p_data->>'format' is distinct from 'meeple-journal-export'
     or p_data->>'version' is distinct from '1'
     or jsonb_typeof(p_data->'games') is distinct from 'array' then
    raise exception 'invalid_file' using errcode = '22023';
  end if;

  -- Two imports for one person never run side by side.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  if exists (select 1 from public.collection_entries where user_id = v_user)
     or exists (select 1 from public.assessments where user_id = v_user)
     or exists (select 1 from public.journal_entries where user_id = v_user)
     or exists (select 1 from public.games where created_by = v_user) then
    raise exception 'account_not_empty' using errcode = '55000';
  end if;

  perform set_config('app.import', 'on', true);

  for v_game in select value from jsonb_array_elements(p_data->'games') loop
    if v_game->>'source' is distinct from 'manual' then
      raise exception 'invalid_file' using errcode = '22023';
    end if;

    insert into public.games
      (name, year, min_players, max_players, play_time_min, description, kind,
       source, visibility, created_by, created_at)
    values (
      btrim(v_game->>'name'),
      (v_game->>'year')::smallint,
      (v_game->>'min_players')::smallint,
      (v_game->>'max_players')::smallint,
      (v_game->>'play_time_min')::smallint,
      v_game->>'description',
      coalesce(v_game->>'kind', 'base'),
      'manual',
      'private',
      v_user,
      coalesce((v_game->>'created_at')::timestamptz, now())
    )
    returning id into v_game_id;
    v_games := v_games + 1;

    for v_copy in select value from jsonb_array_elements(coalesce(v_game->'copies', '[]'::jsonb)) loop
      insert into public.collection_entries
        (user_id, game_id, status, archived_at, acquired_on, sold_on, price, currency,
         source, notes, created_at)
      values (
        v_user,
        v_game_id,
        v_copy->>'status',
        (v_copy->>'archived_at')::timestamptz,
        (v_copy->>'acquired_on')::date,
        (v_copy->>'sold_on')::date,
        (v_copy->>'price')::numeric,
        v_copy->>'currency',
        v_copy->>'source',
        v_copy->>'notes',
        coalesce((v_copy->>'created_at')::timestamptz, now())
      )
      returning id into v_entry_id;
      v_copies := v_copies + 1;
      if v_copy->>'archived_at' is not null then
        v_archived := v_archived + 1;
      end if;

      -- History: starts with no previous status, each row continues the last, and the last row
      -- is the copy's current status.
      v_prev := null;
      if jsonb_typeof(v_copy->'history') is distinct from 'array'
         or jsonb_array_length(v_copy->'history') = 0 then
        raise exception 'invalid_file' using errcode = '22023';
      end if;
      for v_step in select value from jsonb_array_elements(v_copy->'history') loop
        if (v_step->>'from_status') is distinct from v_prev then
          raise exception 'invalid_file' using errcode = '22023';
        end if;
        insert into public.collection_status_changes
          (user_id, entry_id, from_status, to_status, changed_on, recorded_at)
        values (
          v_user,
          v_entry_id,
          v_step->>'from_status',
          v_step->>'to_status',
          (v_step->>'changed_on')::date,
          coalesce((v_step->>'recorded_at')::timestamptz, clock_timestamp())
        );
        v_prev := v_step->>'to_status';
        v_changes := v_changes + 1;
      end loop;
      if v_prev is distinct from v_copy->>'status' then
        raise exception 'invalid_file' using errcode = '22023';
      end if;
    end loop;

    for v_item in select value from jsonb_array_elements(coalesce(v_game->'ratings', '[]'::jsonb)) loop
      v_overall := (v_item->>'overall')::numeric;
      -- numeric(3, 1) would round silently, so refuse more than one decimal.
      if v_overall is null or v_overall <> round(v_overall, 1) then
        raise exception 'invalid_file' using errcode = '22023';
      end if;
      insert into public.assessments (user_id, game_id, overall, assessed_on, created_at)
      values (
        v_user,
        v_game_id,
        v_overall,
        (v_item->>'assessed_on')::date,
        coalesce((v_item->>'created_at')::timestamptz, now())
      );
      v_ratings := v_ratings + 1;
    end loop;

    for v_item in select value from jsonb_array_elements(coalesce(v_game->'thoughts', '[]'::jsonb)) loop
      insert into public.journal_entries
        (user_id, game_id, body, topics, written_on, created_at, updated_at)
      values (
        v_user,
        v_game_id,
        btrim(v_item->>'body'),
        array(select jsonb_array_elements_text(coalesce(v_item->'topics', '[]'::jsonb))),
        (v_item->>'written_on')::date,
        coalesce((v_item->>'created_at')::timestamptz, now()),
        coalesce((v_item->>'updated_at')::timestamptz, (v_item->>'created_at')::timestamptz, now())
      );
      v_thoughts := v_thoughts + 1;
    end loop;
  end loop;

  perform set_config('app.import', '', true);

  return jsonb_build_object(
    'games', v_games,
    'copies', v_copies,
    'archived', v_archived,
    'changes', v_changes,
    'ratings', v_ratings,
    'thoughts', v_thoughts
  );
end;
$$;

revoke execute on function public.import_account(jsonb) from public, anon;
grant execute on function public.import_account(jsonb) to authenticated;
