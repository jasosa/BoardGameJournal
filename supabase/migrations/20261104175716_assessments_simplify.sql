-- L6 redesign: a rating is one overall number on a date. See docs/adr/0012.
--
-- The person chose to drop per-part scores and the summary and context fields: free-text thoughts
-- (with topics) will come with the notes slice, so the rating stays a single number. This removes
-- assessment_scores, the summary and context columns, and the score limit trigger, and replaces
-- add_assessment() and current_ratings with the smaller versions.
--
-- Nothing real is stored yet (L6 was never released). Rollback is not worth keeping: restore the
-- previous shape from 20261104172750_assessments.sql and 20261104173829_assessments_hardening.sql.
-- Dropping the columns and table deletes any summary, context and part scores that exist.

drop view public.current_ratings;

drop function public.add_assessment(uuid, numeric, date, text, text, jsonb);

drop table public.assessment_scores;
drop function public.guard_score_count();

alter table public.assessments drop column summary;
alter table public.assessments drop column context;

-- add_assessment: overall 0 to 10 with at most one decimal, date 1900 to tomorrow.
create function public.add_assessment(
  p_game_id uuid,
  p_overall numeric,
  p_assessed_on date default current_date
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
  if p_assessed_on is null
     or p_assessed_on < date '1900-01-01'
     or p_assessed_on > current_date + 1 then
    raise exception 'invalid_date' using errcode = '22023';
  end if;
  if p_overall is null or p_overall < 0 or p_overall > 10 or p_overall <> round(p_overall, 1) then
    raise exception 'invalid_overall' using errcode = '22023';
  end if;

  insert into public.assessments (game_id, overall, assessed_on)
  values (p_game_id, p_overall, p_assessed_on)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.add_assessment(uuid, numeric, date) from public, anon;
grant execute on function public.add_assessment(uuid, numeric, date) to authenticated;

-- current_ratings: the latest assessment per person and game.
create view public.current_ratings
with (security_invoker = true) as
select distinct on (user_id, game_id)
  id as assessment_id,
  user_id,
  game_id,
  overall,
  assessed_on,
  created_at
from public.assessments
order by user_id, game_id, assessed_on desc, created_at desc;

revoke all on public.current_ratings from anon, authenticated;
grant select on public.current_ratings to authenticated;
