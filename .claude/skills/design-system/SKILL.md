---
name: design-system
description: Meeple Journal visual identity ("Night Wall"), design tokens and UI rules. Use when building or changing any component, page, layout, theme or animation.
---

# Visual identity

"Night Wall" (ADR-0010): covers are lit art on a dark wall, and the interface is the small museum label beside them. A premium collection catalogue first, with an editorial journal behind it. Quiet, precise, dark. Not an admin dashboard. The concept screens are in `docs/design-concepts/` (concept B).

## Tokens (source of truth: `src/lib/design-system/tokens.css`, exposed to Tailwind via `@theme`)
One dark theme. Adjust values in one place only.

Colour
- `--color-canvas` #121316 (page) · `--color-raised` #1B1C20 (surfaces) · `--color-line` #2E2F35 (dividers only)
- `--color-edge` #6F6A62 (borders of inputs, buttons and chips: at least 3:1 on canvas and raised). Never use `line` for a control border.
- `--color-ink` #ECE8DF (text) · `--color-ink-soft` #B0AA9D (secondary text) · `--color-ink-faint` #8E887C
- `--color-accent` #ECE8DF (light accent: primary buttons are light-filled, focus rings) · `--color-accent-strong` #FFFFFF (hover) · `--color-on-accent` #121316
- semantic: `--color-positive` #8AA67F · `--color-negative` #CF7968 · `--color-note` #9A9EB8 (muted, never neon)
- Per game (set on the game page from the cover): `--game-tint` (dark backdrop, at least 5.5:1 against ink) and `--game-glow` (light, at least 4.5:1 against canvas) for lines and the pressed state. Derived in `src/features/catalogue/cover-colours.ts`. Without a cover the page stays neutral.

Typography
- Display: Schibsted Grotesk 600/700, tight tracking (-0.02em, titles -0.03em). Titles, game names. No serif.
- UI/body: Inter, loaded with `next/font`.
- Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 (game title up to 96 on desktop). Body 16px. Line height 1.5 body, 1.15 display. Small labels are 12px uppercase with wide tracking, never body text.

Spacing 4px base. Radius: 2 (inputs, covers), 4 (cards). Elevation: strong soft shadows under covers (`shadow-soft`), one lift level (`shadow-lift`). Motion: 150ms / 250ms, ease-out, respect `prefers-reduced-motion`.

## Rules
- Cover art leads. Covers keep their own proportions (shape limited to 0.6 to 1.6); the Library is a masonry wall. Fallback: a raised 3:4 tile with the initial. Titles sit under covers: title left, year right, status as a small square plus text.
- The top bar (desktop) holds the wordmark, nav, search, the status filters (Library only) and "+ ADD". No page title on the Library. Small screens: search and status move into the page, bottom navigation with a capture button.
- Whitespace over borders. Show at most 2-3 metadata items per card.
- One accent: light cream. No bright primaries, no rainbow status badges, no dense stat grids, no gratuitous animation. Colour comes from the covers.
- No hard-coded colours or arbitrary Tailwind values in components, except values that come from data (cover shape, cover colours) and layout grid templates. Use tokens.
- shadcn/ui is a base for behaviour (dialog, popover, command, sheet). Restyle it with tokens. Never ship the default shadcn look.
- Every interactive element: visible focus ring (accent, 2px offset), a label, 44px min tap target. Control borders use `edge`.
- Ratings: calm visual (numbers or small bars), not star rows full of colour.

## Before finishing UI work
Run the `design-reviewer` agent.
