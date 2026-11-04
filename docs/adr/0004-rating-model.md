# ADR-0004: Rating model

- Status: Accepted (dimension scores dropped 2026-11-04, see ADR-0012)
- Date: 2026-10-30

## Context

Open question Q2. The journal needs ratings that show how an opinion changes over time. Assessments are dated history (CLAUDE.md), so a single editable rating field is not enough.

## Options

1. One overall number per game, edited in place. Simple, but loses history.
2. Dated assessments with an overall score and optional dimensions. More tables, keeps history.
3. Stars or thumbs only. Fast, too coarse for a journal.

## Decision

Option 2.

- `assessments`: `assessed_on`, `overall` numeric(3,1) from 0 to 10, optional `summary`, `context` (`expectation`, `after_play`, `revisit`).
- `assessment_scores`: optional per-dimension scores, same 0 to 10 scale.
- New opinion means a new row. Never overwrite.
- Current rating is derived: latest assessment per user and game, in the `current_ratings` view (`security_invoker = true`).
- Dimension names are free text per user for now. A fixed set is not decided.

## Consequences

- The game page can show a rating timeline.
- Rating UI must be quick: overall first, dimensions optional.
- Corrections to a typo are a new row or a small edit path. Decide in the assessments slice.
