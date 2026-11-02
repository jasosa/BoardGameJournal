-- L5: limits for the facts a person can edit on a game. The edit form validates the same
-- ranges with Zod; these constraints hold even if a row is written some other way.
--
-- Rollback (local, no data depends on it): alter table public.games drop constraint
-- games_year_range, drop constraint games_description_length; then delete this file and
-- run `npx supabase db reset`.

alter table public.games
  add constraint games_year_range check (year between 1 and 2200),
  add constraint games_description_length check (length(description) <= 2000);
