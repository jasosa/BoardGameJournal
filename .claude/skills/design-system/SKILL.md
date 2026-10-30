---
name: design-system
description: Meeple Journal visual identity, design tokens and UI rules. Use when building or changing any component, page, layout, theme or animation.
---

# Visual identity

A premium collection catalogue meets an editorial gaming journal. Calm, warm, crafted. Think a well-printed rulebook or a quality magazine, not an admin dashboard.

## Tokens (source of truth: `src/lib/design-system/tokens.css`, exposed to Tailwind via `@theme`)
Starting values. Adjust in one place only.

Colour (light)
- `--color-paper` #FAF7F2 (page) · `--color-cream` #F2ECE1 (surfaces) · `--color-line` #E4DCCD
- `--color-ink` #23211E (text) · `--color-ink-soft` #5C574F (secondary text) · `--color-ink-faint` #8E877C
- `--color-bronze` #9A6B3F (accent, links, focus) · `--color-bronze-deep` #7A5230
- semantic: `--color-positive` #5E7A55 · `--color-negative` #A2483A · `--color-note` #6B6F86 (muted, never neon)
Colour (dark): warm charcoal #1B1A18 page, #24221F surfaces, cream text #EDE6D9, bronze #C08A57.

Typography
- Display: an expressive serif (candidates: Fraunces, Newsreader, Cormorant). Titles, game names, journal headings.
- UI/body: a readable sans (candidates: Inter, Source Sans 3, Geist). Load with `next/font`.
- Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48. Body 16px. Line height 1.5 body, 1.15 display.

Spacing 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Radius: 4 (inputs), 8 (cards), 2 (covers). Elevation: very soft warm shadows, two levels only. Motion: 150ms / 250ms, ease-out, respect `prefers-reduced-motion`.

## Rules
- Cover art leads. Fixed ratio per view (gallery 3:4 or box-art fit with blurred backdrop). Fallback: cream tile with the title in display type.
- Whitespace over borders. Show at most 2-3 metadata items per card.
- Bronze is an accent. One accent element per view region.
- No bright primaries, no rainbow status badges, no dense stat grids, no gratuitous animation.
- No hard-coded colours, sizes or arbitrary Tailwind values in components. Use tokens.
- shadcn/ui is a base for behaviour (dialog, popover, command, sheet). Restyle it with tokens. Never ship default shadcn look.
- Mobile: bottom navigation + a large Quick Capture button within thumb reach. Sheets slide from the bottom.
- Every interactive element: visible focus ring (bronze, 2px offset), label, 44px min tap target.
- Ratings: calm visual (numbers or small bars), not star rows full of colour.

## Before finishing UI work
Run the `design-reviewer` agent.
