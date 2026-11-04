-- L7 security review: the body limit could be bypassed with whitespace.
--
-- The first check was length(btrim(body)) between 1 and 10000. btrim removes only spaces, so a
-- direct update (PostgREST does not trim) could store a body padded with a million spaces, and a
-- body of only tabs or newlines counted as "not empty". The check now limits the whole stored
-- text to 10,000 characters and needs at least one visible character. add_thought() and the
-- service trim the text first, so normal saves are unchanged.
--
-- Rollback: restore the old check, length(btrim(body)) between 1 and 10000.

alter table public.journal_entries
  drop constraint journal_entries_body_check;

alter table public.journal_entries
  add constraint journal_entries_body_check
  check (length(body) <= 10000 and body ~ '\S');
