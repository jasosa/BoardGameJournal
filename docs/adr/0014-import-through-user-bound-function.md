# ADR-0014: Import runs as a user-bound database function, not through the service role

- Status: Accepted
- Date: 2026-11-10

## Context

ROADMAP L8 asks for a JSON export that can be imported into an empty account. An import has to write things a normal request may not: status history rows (ADR-0009 closes direct writes), the original `created_at` of ratings and thoughts (guard triggers set it to now), and the original first history row. ADR-0009 said an import "goes through a service-role path". The Supabase client also cannot run several statements in one transaction, and a half-finished import would leave a broken library.

## Options

1. A server action that uses the service role key to write everything. It would need the key inside a user request, and each insert is its own transaction.
2. Relax the guard triggers for everyone. Weakens ADR-0009 and the rating rules for every other write.
3. One `security definer` function tied to `auth.uid()`, which sets a transaction-local flag that three triggers honour.

## Decision

Option 3. `public.import_account(p_data jsonb)`:

- Takes the user from `auth.uid()`. Nothing in the file chooses the owner. Executable by `authenticated` only.
- Refuses unless the account is empty (no copies, archived included, no ratings, no thoughts, no games the user created). A per-user advisory lock stops two imports from running side by side (see the accepted limits below).
- Writes games (private, manual, owned by the user), copies, status history, ratings and thoughts in one transaction. Any bad value raises and everything rolls back.
- Makes new ids and keeps the original dates and timestamps, so "Added", History order and rating and thought times survive.
- Validates itself, because anyone can call it straight through the API and skip the app's checks: dates between 1900-01-01 and tomorrow, timestamps between 1900-01-01 and one day ahead (no infinity), a thought's `updated_at` not before its `created_at`, source `manual`, and a payload of at most 12 MB. Owners, visibility and ids in the file are ignored.
- Checks each copy's history: first row has no previous status, each row continues the last, the last row equals the copy's status.
- Sets `app.import = 'on'` for the transaction. `log_first_status()` then skips its automatic first row, and `guard_assessment_insert()` and `guard_journal_insert()` keep the file's `created_at` (and `updated_at`). The date range checks stay. The flag follows the pattern of `app.added_on` and `app.status_change`. The API exposes functions, not `set_config()`, so a user cannot raise it.

The file format is version 1 (`"format": "meeple-journal-export"`), described by one Zod schema in `src/features/export/schemas.ts`, shared by the export check, the check on the device and the server import. The server checks the file again before calling the function.

## Consequences

- No service role key runs in a user request. ADR-0009's consequence about "a service-role path" is replaced by this function.
- Import works only into an empty account. There is no merge and no replace, and no way to undo an import. A "clear my account" action is out of scope.
- Any new personal table (plays, campaigns, tags) must be added to the export schema, the export build and `import_account()` in the same slice that creates it. The format version goes up if the shape changes.
- Version 1 holds manual games only. When catalogue providers arrive (L2), the format needs a decision on linking games by `external_id`, probably version 2.
- Covers are not in the file. Each game keeps a cover reference (path, size, colours) so a later "covers too" export can match files to games. Imported games show their initial.
- The size limit is 10 MB, under the 11 MB server action limit. Import time for a very large file on the hosting plan is untested.
- Accepted limits (from the security review): the lock stops an import running beside another import, not beside a normal add made in a second tab at the same moment. The result could be an import plus one extra game, in that person's own data only. A person can also delete everything (archive, then delete each copy and game) and import again with any history they like, so "append-only" (ADR-0009) holds for the app, not against a person rewriting their own empty account.
- A person who has a copy of a catalogue (provider) game cannot export in version 1. The export stops with an error instead of writing a file with a hole. L2 must decide this together with the version 2 format.
- Rollback: drop `import_account(jsonb)`, `import_valid_date()` and `import_valid_ts()`, and restore the three trigger functions from `20261102184000`, `20261104173829` and `20261104192422`. Rows already imported stay, because they are ordinary rows.
