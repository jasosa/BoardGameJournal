# ADR-0005: Journal editing and drafts

- Status: Accepted
- Date: 2026-10-30

## Context

Open questions Q3 and Q4. Notes are written at the table, often on a phone with a weak connection. Losing a half-written note is the main risk. Full offline sync is out of scope.

## Options

1. Rich text editor plus offline sync. Heavy and a large scope jump.
2. Plain textarea, light Markdown rendering, local draft recovery. Small and reliable.
3. Plain textarea with no draft recovery. Simplest, loses text on a crash or lost connection.

## Decision

Option 2.

- `journal_entries.body` is Markdown text. Edit with a plain textarea. Render a safe subset (bold, italics, lists, links). Sanitise on render.
- Drafts live in browser local storage, keyed by form and target id. Cleared after a successful save.
- A failed save keeps the draft and shows a calm retry message.
- No offline sync and no service-worker write queue in the MVP.

## Consequences

- No editor dependency to maintain.
- Drafts are per device and are not backed up. State this in the UI copy.
- Revisit if real use shows people lose notes offline.
