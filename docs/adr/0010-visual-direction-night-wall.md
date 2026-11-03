# ADR-0010: Visual direction "Night Wall" (trial)

- Status: Proposed (trial on the `concept-b` branch, not merged)
- Date: 2026-11-03

## Context

The first direction (CLAUDE.md, `design-system` skill) was warm paper, cream, charcoal and one bronze accent with a display serif. After the Library and game page were built, three alternative directions were drawn as static concepts (`docs/design-concepts/`): A "Rulebook", B "Night Wall", C "Logbook". B was chosen to try: covers are lit art on a dark wall and the interface is the small museum label.

## Decision (for the trial)

- One dark theme. Token names are kept; values change (base `#121316`, raised `#1B1C20`, text `#ECE8DF`). "bronze" becomes a light accent (primary buttons are light-filled, focus rings are light). A control-edge token (`--tk-edge`) keeps input and button borders at 3:1 or more.
- Schibsted Grotesk (display) and Inter (body). No serif.
- Thin fixed top bar, wider content area (7xl), a tight cover wall in the Library, titles under covers, status as a small square plus text.
- Each cover gets two colours when it is uploaded: `dominant_color` (a dark tint, at least 5.5:1 against the page text) and `accent_color` (a light glow, at least 4.5:1 against the base). The game page paints a soft backdrop from the tint and marks the pressed status with the glow. Stored on `game_images` (migration `20261103212753_cover_colours.sql`), decoration only.
- The theme toggle is removed on the branch.

## Consequences

- Stored covers are still cropped to 3:4, so the wall is even. A ragged masonry that keeps real ratios needs a change to the cover pipeline (a separate decision).
- No light theme. If B is kept, decide whether to design a light counterpart.
- Existing covers have no colours until `npm run covers:colours` is run.
- If kept: mark this ADR Accepted, update CLAUDE.md "Visual direction" and the `design-system` skill, rename the `bronze` tokens, and merge. If dropped: delete the branch; nothing on `main` changes.
