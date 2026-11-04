-- Fix: two status changes made at the same moment could be listed in the wrong order.
--
-- collection_status_changes.recorded_at defaulted to now(), which is the time the transaction
-- started. change_entry_status() locks the copy before it writes, so when two changes arrive
-- together the second one waits, but its transaction started first and got the earlier time. The
-- History list sorts by recorded_at, so the chain of "from" and "to" could look broken. A row now
-- takes the actual clock time at the moment it is inserted, after the lock is held.
--
-- Existing rows keep their values. Rollback: set the default back to now().

alter table public.collection_status_changes
  alter column recorded_at set default clock_timestamp();
