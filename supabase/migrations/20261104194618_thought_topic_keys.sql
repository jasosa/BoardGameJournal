-- L7 contract fix: the topic key for solo play is "solo_mode" (underscore), as in the approved
-- UX concept (docs/design-concepts/thoughts/concept.md, line 84). The first version of
-- topics_valid() in 20261104192422 used "solo mode". journal_entries holds no rows yet; any
-- row that used the old key is converted after the check accepts the new key.
--
-- Rollback (local): put "solo mode" back in topics_valid() only after converting the rows back,
-- because the old check rejects "solo_mode".

create or replace function public.topics_valid(p_topics text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_topics is not null
    and p_topics <@ array[
      'mechanics', 'theme', 'artwork', 'components', 'production',
      'replayability', 'solo_mode', 'interaction', 'combat'
    ]::text[]
    and (select count(distinct t) from unnest(p_topics) as t) = cardinality(p_topics);
$$;

-- The check must know the new key before any row uses it.
update public.journal_entries
set topics = array_replace(topics, 'solo mode', 'solo_mode')
where 'solo mode' = any (topics);
