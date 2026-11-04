# ADR-0011: Removing a game archives the copy; permanent delete is a separate, guarded step

- Status: Accepted
- Date: 2026-11-04

## Context

ROADMAP L4b needs a way to remove a game from the Library. CLAUDE.md says selling or removing a game never deletes plays, assessments or journal entries. ADR-0009 closed direct deletes on `collection_entries` because a delete cascades to the status history. The user chose: archive, plus permanent delete when nothing is attached.

## Options

1. Archive only. Safe, but a mistaken or test entry can never be removed.
2. Archive, and permanent delete as a second step through one database function.
3. Open `delete` on `collection_entries` to owners. A single tap could wipe history, and nothing checks what is attached.

## Decision

Option 2.

- `collection_entries.archived_at` marks an archived copy. It leaves the Library by default (`?archived=1` shows only archived copies) and keeps its status history. Archiving and restoring write no history row: status history stays about status.
- `archive_entry` and `restore_entry` are security invoker, owner only through row security, and safe to repeat. Archiving twice keeps the first date.
- `delete_entry` is security definer with `search_path = ''`. It checks `auth.uid()` owns the copy, refuses unless the copy is already archived, deletes the copy (its history cascades), and deletes the game too when it was the last copy of a private manual game created by the caller. Provider or public games are never deleted. It returns null (not found), `not_archived`, `deleted` or `deleted_with_game`.
- Authenticated users still have no `delete` privilege on `collection_entries`; `delete_entry` is the only path. A guard trigger was considered and left out: it would also block the cascade that runs when an account is deleted.
- The service lists the cover files before the call and removes them from the `covers` bucket only when the game was deleted. This closes the orphan-files gap for this path (STATUS tech debt item on covers). Account deletion still leaves files behind.
- Archived copies still count as duplicate-title matches and are labelled "archived", so adding the same title offers to open it, not to create a second game.
- The UI asks before permanent delete and says what is lost: the copy and its status history.

- `delete_entry` returns jsonb `{result, paths}`. It locks the game row, reads the cover paths before the cascade and returns them only when the game was deleted, so the server removes exactly those files and no separate read can go stale.
- `change_entry_status` still accepts an archived copy at the database level. The game page hides the status picker for archived copies; restore first.

## Consequences

- **Rule for future tables:** plays, assessments and journal entries must reference `collection_entries` and `games` with `on delete restrict` (or no action), never cascade. Then the database refuses a delete even if `delete_entry` is not updated.
- Permanent deletes cannot be undone except from a backup. Rolling back the migration by dropping `archived_at` would put every archived copy back in the Library.
- Failed cover file removals are not logged yet (`removeObjects` ignores the storage error); stray files stay in the owner's private folder.

- **Plays, assessments and journal entries do not exist yet.** `delete_entry` has a marked place for an "is anything attached" check. When those tables land, their migration must extend `delete_entry` to refuse while rows are attached (or to keep them, if they are designed to outlive an entry). Until then, the check is trivially true.
- Deleting a copy removes its status history for good. That is deliberate and only reachable from an archived copy after a confirm.
- The service role and postgres can still delete entries by hand (unchanged from ADR-0009).
