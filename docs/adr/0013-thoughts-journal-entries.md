# ADR-0013: Thoughts are journal entries, editable by their owner, with fixed topics

- Status: Accepted
- Date: 2026-11-04

## Context

ROADMAP L7 asks for free-form notes on a game. The person wants thoughts (free text about a game) that can be marked with one or more topics (parts of the game), and approved the "topic notebook" concept with Option B (a "+ Add thought" link, a "···" menu per row). docs/ARCHITECTURE.md already plans a `journal_entries` table, and ADR-0005 fixes how journal text is written: a plain textarea, light Markdown, local drafts, no offline sync.

## Options

1. Reuse `journal_entries` from the architecture, with only the columns this slice needs.
2. A new `thoughts` table, and a separate `journal_entries` later for plays and campaigns.
3. Store thoughts as columns on `collection_entries`. Wrong place: thoughts belong to the game, not to one copy.

## Decision

Option 1.

- `journal_entries`: `user_id` (owner-only row security), `game_id` (not null, `on delete no action`), `body` (1 to 10,000 characters after trim), `topics text[]`, `written_on` (the person's local today), `created_at`, `updated_at`. Plays, campaigns and tone get their own nullable columns in the migrations that need them.
- Topics are the nine of the screen: mechanics, theme, artwork, components, production, replayability, solo mode, interaction, combat. The database accepts only these keys, with no duplicates (`topics_valid`). They are not scores and are not editable by the person for now.
- Unlike ratings (ADR-0012), thoughts are editable and deletable by their owner: they are text the person wrote, not history. Only `body` and `topics` can change (a column grant); `written_on`, `game_id` and `user_id` cannot. There is no "edited" mark, and deleting is for good with a confirm in the UI.
- A thought belongs to the game, not to a copy. Removing or archiving a copy never touches it. `delete_entry()` keeps a game that has thoughts, even when its last copy is deleted. The `no action` foreign key follows the rule in ADR-0011 (account deletion cascades to games and thoughts in one statement).
- `add_thought()` (security invoker) checks the date range and inserts. A before-insert trigger gives direct inserts the same date range and always sets `created_at`.
- The date of a thought is always today for now; the person cannot pick it.
- Light Markdown is read by `src/features/thoughts/markdown.ts`, which returns a tree and never HTML. Only http and https links are kept. The screen renders every text as plain text.
- Newest first by `written_on`, then `created_at`. The screen reads up to 500 thoughts of a game and filters by topic and pages (10 at a time) on the device.

- The date of a new thought comes from the screen (the person's local today). The server accepts it only within one day of its own date and otherwise uses its own today, so a direct call cannot backdate a thought. The database also limits the date to 1900 to tomorrow.
- The body check limits the whole stored text to 10,000 characters and needs at least one visible character, so padding with whitespace cannot get around the limit on a direct update.
- Drafts are stored per account (`draft:thought:<userId>:...`) and are cleared when the person signs out, so a shared browser never shows one account's text to another.
- A shared public game that has a `created_by` would block that person's account deletion once others have thoughts on it (the same limit as ratings and copies). Only the service role can create such a game today; revisit in the sharing ADR.

## Consequences

- Drafts stay on the device and are not backed up (ADR-0005); the UI says so.
- Thoughts must be included in the L8 export.
- Searching across all games, a global journal page, photos, tone and links to plays or campaigns are Phase 2 and are not designed here.
- Rollback: drop `journal_entries` and `topics_valid`, and restore `delete_entry()` from the ratings migration. Dropping the table deletes every thought, so export first.
