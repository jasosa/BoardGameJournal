-- L8 security review follow-up: import_account() validates dates and size itself.
--
-- The function is the trust boundary. Anyone can call it straight through the API and skip the
-- app's checks, so it must refuse what the app would refuse. Before this change a direct call
-- could store infinity, far-future or far-past dates and timestamps, which would also break the
-- person's own export (the export check refuses them) and the History order.
--
-- Dates must lie between 1900-01-01 and tomorrow (the same range as status changes, ratings and
-- thoughts). Timestamps must lie between 1900-01-01 and one day ahead. A thought's updated_at
-- cannot be before its created_at. The payload is limited to 12 MB (the app limit is 10 MB).
--
-- Rollback (nothing depends on it): restore import_account(jsonb) from 20261110175457 and drop
-- import_valid_date() and import_valid_ts(). Or `npx supabase db reset`.

create function public.import_valid_date(p_value date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_value is not null
    and p_value between date '1900-01-01' and current_date + 1;
$$;

create function public.import_valid_ts(p_value timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_value is not null
    and p_value between timestamptz '1900-01-01 00:00:00+00' and now() + interval '1 day';
$$;

-- Only import_account() calls these.
revoke execute on function public.import_valid_date(date) from public, anon, authenticated;
revoke execute on function public.import_valid_ts(timestamptz) from public, anon, authenticated;

create or replace function public.import_account(p_data jsonb)
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
  v_created timestamptz;
  v_updated timestamptz;
  v_recorded timestamptz;
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
     or pg_column_size(p_data) > 12 * 1024 * 1024
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

    v_created := coalesce((v_game->>'created_at')::timestamptz, now());
    if not public.import_valid_ts(v_created) then
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
      v_created
    )
    returning id into v_game_id;
    v_games := v_games + 1;

    for v_copy in select value from jsonb_array_elements(coalesce(v_game->'copies', '[]'::jsonb)) loop
      v_created := coalesce((v_copy->>'created_at')::timestamptz, now());
      if not public.import_valid_ts(v_created)
         or (v_copy->>'archived_at' is not null
             and not public.import_valid_ts((v_copy->>'archived_at')::timestamptz))
         or (v_copy->>'acquired_on' is not null
             and not public.import_valid_date((v_copy->>'acquired_on')::date))
         or (v_copy->>'sold_on' is not null
             and not public.import_valid_date((v_copy->>'sold_on')::date)) then
        raise exception 'invalid_file' using errcode = '22023';
      end if;

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
        v_created
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
        v_recorded := coalesce((v_step->>'recorded_at')::timestamptz, clock_timestamp());
        if not public.import_valid_date((v_step->>'changed_on')::date)
           or not public.import_valid_ts(v_recorded) then
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
          v_recorded
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
      v_created := coalesce((v_item->>'created_at')::timestamptz, now());
      -- numeric(3, 1) would round silently, so refuse more than one decimal.
      if v_overall is null or v_overall <> round(v_overall, 1)
         or not public.import_valid_date((v_item->>'assessed_on')::date)
         or not public.import_valid_ts(v_created) then
        raise exception 'invalid_file' using errcode = '22023';
      end if;
      insert into public.assessments (user_id, game_id, overall, assessed_on, created_at)
      values (
        v_user,
        v_game_id,
        v_overall,
        (v_item->>'assessed_on')::date,
        v_created
      );
      v_ratings := v_ratings + 1;
    end loop;

    for v_item in select value from jsonb_array_elements(coalesce(v_game->'thoughts', '[]'::jsonb)) loop
      v_created := coalesce((v_item->>'created_at')::timestamptz, now());
      v_updated := coalesce((v_item->>'updated_at')::timestamptz, v_created);
      if not public.import_valid_date((v_item->>'written_on')::date)
         or not public.import_valid_ts(v_created)
         or not public.import_valid_ts(v_updated)
         or v_updated < v_created then
        raise exception 'invalid_file' using errcode = '22023';
      end if;
      insert into public.journal_entries
        (user_id, game_id, body, topics, written_on, created_at, updated_at)
      values (
        v_user,
        v_game_id,
        btrim(v_item->>'body'),
        array(select jsonb_array_elements_text(coalesce(v_item->'topics', '[]'::jsonb))),
        (v_item->>'written_on')::date,
        v_created,
        v_updated
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
