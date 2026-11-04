-- L6 security review follow-up (see 20261104172750_assessments.sql and docs/adr/0012).
--
-- 1. A direct insert on assessments could set a far-future date or a chosen created_at, and
--    because ratings are append-only it would stay current for good. A trigger now checks the
--    date range and always sets created_at to now().
-- 2. A cap of 20 scores per assessment (the default set has 9), for direct inserts too.
-- 3. Dimension names are stored trimmed and lower-case, so "Theme" and "theme" are one dimension.
-- 4. add_assessment checks overall and each score before inserting: 0 to 10 with at most one
--    decimal (numeric(3,1) would round 9.96 to 10.0 silently), and trims and lower-cases names.
--
-- Rollback (local): drop the two triggers and their functions, drop the two new check
-- constraints, and restore add_assessment() from 20261104172750. Before dropping the assessment
-- tables themselves, export assessments and assessment_scores: dropping them deletes every rating.

-- 1. Date range and created_at on direct inserts ---------------------------------------------

create function public.guard_assessment_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assessed_on < date '1900-01-01' or new.assessed_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;
  new.created_at := now();
  return new;
end;
$$;

create trigger assessments_guard_insert
  before insert on public.assessments
  for each row execute function public.guard_assessment_insert();

-- 2. At most 20 scores per assessment --------------------------------------------------------

create function public.guard_score_count()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.assessment_scores where assessment_id = new.assessment_id) >= 20 then
    raise exception 'too_many_scores' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger assessment_scores_guard_count
  before insert on public.assessment_scores
  for each row execute function public.guard_score_count();

-- 3. Dimension names are trimmed and lower-case ----------------------------------------------

-- Nothing real is stored yet; normalise anything that is, so the constraint can be added.
update public.assessment_scores set dimension = lower(btrim(dimension))
where dimension <> lower(btrim(dimension));

alter table public.assessment_scores
  add constraint assessment_scores_dimension_normal
  check (dimension = lower(btrim(dimension)));

-- 4. add_assessment checks before inserting --------------------------------------------------

create or replace function public.add_assessment(
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
  if p_overall is null or p_overall < 0 or p_overall > 10 or p_overall <> round(p_overall, 1) then
    raise exception 'invalid_overall' using errcode = '22023';
  end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'invalid_scores' using errcode = '22023';
  end if;

  insert into public.assessments (game_id, overall, assessed_on, summary, context)
  values (p_game_id, p_overall, p_assessed_on, nullif(btrim(p_summary), ''), p_context)
  returning id into v_id;

  for v_dimension, v_score in select key, value from jsonb_each_text(p_scores) loop
    -- Text values only; a nested object or array arrives as text and fails the cast below.
    if v_score !~ '^\d{1,2}(\.\d)?$' or v_score::numeric > 10 then
      raise exception 'invalid_scores' using errcode = '22023';
    end if;
    insert into public.assessment_scores (assessment_id, dimension, score)
    values (v_id, lower(btrim(v_dimension)), v_score::numeric);
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.add_assessment(uuid, numeric, date, text, text, jsonb)
  from public, anon;
grant execute on function public.add_assessment(uuid, numeric, date, text, text, jsonb)
  to authenticated;
