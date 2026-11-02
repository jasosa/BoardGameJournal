# ADR-0009: Status history is append-only and changes go through one function

- Status: Accepted
- Date: 2026-11-02

## Context

ROADMAP L3 asks for collection status changes with history kept. PRODUCT_SPEC section 6 says any transition is allowed and changing status never deletes plays, assessments or journal entries. Today a change overwrites `collection_entries.status`, so nothing remembers that a game was a wishlist item first, or when it was sold. The person wants to set the date a change happened ("sold in June"), not only the moment they tapped.

## Options

1. A trigger on `collection_entries` that logs every status update. Simple, but it cannot take a date chosen by the person.
2. A database function that changes the status and writes the history row together, with direct status updates closed. Takes a date, and nothing can skip the history.
3. Let the app write the history row itself. Two separate writes can fail halfway, and a direct API call could skip the history.
4. Make history editable. Flexible, but the history can then be rewritten, against the dated-history principle used for ratings (ADR-0004).

## Decision

Option 2.

- New table `collection_status_changes` (personal, owner-only read). Columns: entry, user, from status (null for the first row), to status, `changed_on` (the date the person says it happened), `recorded_at` (when it was logged).
- Append-only: authenticated users can only `select`. Insert, update and delete are not granted.
- Two writers: a trigger on `collection_entries` insert writes the first row, and `change_entry_status(entry, status, date)` (security definer, `search_path = ''`) updates the entry only when it belongs to `auth.uid()`, checks the date, and writes the row in one transaction. Setting the same status again writes nothing.
- Direct status updates are closed: `update` on `collection_entries` is granted only for the other columns.
- Dates must be between 1900-01-01 and tomorrow (one day of time zone slack, which also lets a person west of UTC pick tomorrow). A date earlier than the first row is allowed, because people add games they bought years ago.
- The first row takes the date given when the game is added (the browser sends the person's local today). `add_manual_game` passes it to the trigger through a transaction-local setting that is used once.
- The History list is in the order changes were logged, latest first, so the top row always matches the current status. The date the person gave is the label and may be earlier than rows below it.
- A guard trigger refuses any change to `collection_entries.status` unless it happens inside `change_entry_status`, so even the service role and manual SQL cannot skip the history by accident. A deliberate import must set the same transaction-local flag.
- Authenticated users cannot delete collection entries through the API, because a delete would remove the history with it (cascade). A future "remove from collection" feature must decide what happens to the history (keep it, or archive the entry instead of deleting it).
- Existing entries get one first row from their creation date. Earlier changes were never recorded and are not invented.

## Consequences

- The status shown on a game always matches the last history row, and no path can change one without the other.
- A wrong entry cannot be removed or edited by the person. If that turns out to be needed, add a correction row type, not an edit, in a new ADR.
- Every new way to change a status must call the function. Any import (L8) must write history through a service-role path on purpose.
- Deleting an entry deletes its history (cascade), which is why owners cannot delete entries yet. Removing a game from the collection is not built and needs its own decision about keeping history.
- The export format (L8) must include history.
