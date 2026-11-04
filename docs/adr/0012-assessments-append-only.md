# ADR-0012: Assessments are append-only and a correction is a new row

- Status: Accepted (amended 2026-11-04, see Amendment)
- Date: 2026-11-04

## Context

ADR-0004 chose dated assessments (an overall 0 to 10 plus optional dimension scores) and left open how a mistaken rating is fixed ("a new row or a small edit path. Decide in the assessments slice"). ROADMAP L6 asks that a new assessment never overwrites an old one and that history is visible. Status history is already append-only (ADR-0009).

## Options

1. Append-only. A correction is a new assessment. Simple, and the rule is the same as status history.
2. Append-only, plus the owner may delete a wrong row. Needs a delete path and a confirm, and the history can lose rows.
3. Editable rows. Loses the dated history.

## Amendment (2026-11-04)

The person asked for a calmer page and dropped per-part scores. A rating is now only an overall number on a date. `assessment_scores`, the `summary` and `context` columns and the dimension list were removed (migration `20261104175716`). Free-text thoughts, each tagged with one or more topics (parts of the game), will come with the notes slice (L7). The decisions below that mention dimensions, summary or context no longer apply.

## Decision

Option 1.

- `assessments` and `assessment_scores` are personal tables with owner-only row security. Authenticated users can `select` and `insert` only. No update, delete or truncate through the API. The service role and postgres can still change rows by hand.
- A rating belongs to a person and a game, not to a copy. Selling or removing a copy never touches it.
- `add_assessment()` (security invoker) inserts the assessment and its scores in one transaction, so a bad score never leaves a half-saved rating. Dates run from 1900-01-01 to tomorrow (a day of slack for time zones). The screen always uses the person's local today for now.
- The current rating is the latest assessment: newest `assessed_on`, then newest `created_at`. The `current_ratings` view (`security_invoker = true`) derives it.
- Any game the person can see can be rated. Ownership is not required.
- Dimension names are free text (1 to 40 characters) in the database. The screen offers the default set from the spec: mechanics, theme, artwork, components, production, replayability, solo mode, interaction, combat.
- `assessments.game_id` is `on delete no action`. `restrict` would break account deletion, which cascades to the person's games and assessments in one statement. This follows the rule in ADR-0011: future personal tables use no action or restrict, never cascade, when they point at a game or an entry.
- `delete_entry()` (ADR-0011) keeps the game when the person has assessments for it, even if the last copy was deleted.

## Consequences

- A typo in a rating stays in the history. The person adds a new rating dated today. Edit and delete come with J6 (Phase 2) if they are still wanted.
- Rating again on the same day is allowed; the one logged last is current.
- Not built: sorting or filtering the Library by rating, hiding dimensions, choosing another date, per-dimension trends.
- Rollback: drop the view, `add_assessment` and both tables, and restore `delete_entry()` from the L4b migration. Dropping the tables deletes every rating.
