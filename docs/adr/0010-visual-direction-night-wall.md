# ADR-0010: Visual direction "Night Wall" (trial)

- Status: Proposed (trial on the `concept-b` branch, not merged)
- Date: 2026-11-03

## Context

The first direction (CLAUDE.md, `design-system` skill) was warm paper, cream, charcoal and one bronze accent with a display serif. After the Library and game page were built, three alternative directions were drawn as static concepts (`docs/design-concepts/`): A "Rulebook", B "Night Wall", C "Logbook". B was chosen to try: covers are lit art on a dark wall and the interface is the small museum label.

## Decision (for the trial)

- One dark theme. Token names are kept; values change (base `#121316`, raised `#1B1C20`, text `#ECE8DF`). "bronze" becomes a light accent (primary buttons are light-filled, focus rings are light). A control-edge token (`--tk-edge`) keeps input and button borders at 3:1 or more.
- Schibsted Grotesk (display) and Inter (body). No serif.
- Thin fixed top bar, wide content area (up to 2xl), a tight cover wall in the Library, titles under covers, status as a small square plus text.
- Each cover gets two colours when it is uploaded: `dominant_color` (a dark tint, at least 5.5:1 against the page text) and `accent_color` (a light glow, at least 4.5:1 against the base). The game page paints a soft backdrop from the tint and marks the pressed status with the glow. Stored on `game_images` (migration `20261103212753_cover_colours.sql`), decoration only.
- The theme toggle is removed on the branch.

## Update (same day): match the concept

The first version of the trial did not look like the concept, so it was reworked:

- Covers keep their own proportions (longer side 1200 px and 480 px, shape limited to 0.6 to 1.6, real width and height stored). Covers uploaded before this stay 3:4 because the originals were never kept. The Library is a masonry wall (CSS columns).
- The top bar holds the search field and the status filters (links, several can be on); there is no page title. A small meta row has the count, sort, view and "More filters" (players, play time). On small screens search and status move into the page.
- Captions: title left, year right, a status marker in the cover's own colour. Games without a cover show their initial on a raised tile.
- One deliberate difference from the concept: borders of inputs and buttons use `--tk-edge` (3:1 contrast) instead of a faint hairline.

## Consequences

- The wall is ragged only for covers uploaded after the pipeline change; older covers stay 3:4.
- No light theme. If B is kept, decide whether to design a light counterpart.
- Existing covers have no colours until `npm run covers:colours` is run.
- If kept: mark this ADR Accepted, update CLAUDE.md "Visual direction" and the `design-system` skill, rename the `bronze` tokens, and merge. If dropped: delete the branch; nothing on `main` changes.
