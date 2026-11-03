# Product Spec: Meeple Journal

Status: v0.1 draft, from HANDOVER.md (22 Oct 2026). Update this file when requirements change. Decisions go to `adr/`.

## 1. Promise

Capture quickly when needed, explore beautifully later, and build a lasting record of what you think about the games you play.

A personal gaming journal that happens to manage a collection. Not a BGG clone.

## 2. Principles

1. Personal before social.
2. Fast capture, rich detail (detail is always optional).
3. Visual by default.
4. One source of truth: game identity, ownership, plays, campaigns and opinions are separate but linked.
5. Opinions evolve: assessments are history, never overwritten.
6. Campaign continuity after weeks or months away.
7. Private by default.
8. Portable data (export everything).
9. Avoid unnecessary complexity.

## 3. Users and platform

- First user: the creator. Private single-user deployment first.
- Data model and security ready for many users from day one.
- Responsive web, desktop + mobile (Android). PWA install is desirable. No native apps.

## 4. Screens

| Screen | Purpose | P |
|---|---|---|
| Home | Recent activity, active campaigns, quick actions | P0 (campaigns P1) |
| Library | Gallery / shelf / table views, search, filters, sort | P0 (custom shelves P1) |
| Game detail | Personal dossier: cover, metadata, status, rating, assessments, pros/cons, plays, journal | P0 (campaigns, photos P1) |
| Journal | Chronological, searchable thoughts and plays | P0 |
| Campaigns | Playthroughs, scenarios, progress, next-session notes | P1 |
| Insights | Trends, mechanic preferences, comparisons | P2 |
| Quick Capture | Global action: add game, log play, capture thought | P0 |
| Settings | Account, export/import, theme | P0 |

Navigation: desktop top or side nav with 4-5 items. Mobile bottom nav + a central Quick Capture button.

## 5. Key flows

### 5.1 Add a game (target: under 10s for a known game, excluding provider latency)
1. Open Quick Capture → "Add game" (or "Add" in Library).
2. Type a title. Debounced search of the catalogue provider plus my existing games.
3. Pick title, then edition if more than one (default: most common / first).
4. Pick status: Owned · Wishlist · Interested · Previously owned. Default Owned.
5. Save. Cover and metadata appear. Enrichment (purchase price, date, notes) later.
- Provider down or no match: "Create manually" with the title prefilled.

### 5.2 Log a play (target: under 15s)
- Game: inherited from current page, or chosen with a fast picker (recent games first).
- Date defaults to today. Optional: duration, players, solo flag, result/score, short note.
- No rating required. Save shows an immediate confirmation with "Add more detail".

### 5.3 Capture a thought (target: under 10s)
- Free text. Linked to a game (and optionally a play or campaign).
- Optional tone: positive · negative · observation.
- Saves immediately. Draft kept locally while typing. Editable later.

### 5.4 Assess a game
- Overall rating plus optional dimension scores (default set: mechanics, theme, artwork, components, production, replayability, solo mode, interaction, combat; user can hide dimensions).
- Each assessment is dated. The latest one is "current". Older ones are visible as history.
- Optional: expectations before playing vs. after (purchase considerations).

## 6. Collection statuses

`owned`, `wishlist`, `interested`, `previously_owned`. Any transition is allowed. Changing status never deletes plays, assessments or journal entries. A game can have plays without being owned.

## 7. UX requirements

- Immediate feedback on save. Optimistic updates for safe operations with rollback on error.
- Draft recovery after accidental navigation (local storage).
- Full keyboard navigation, visible focus, accessible labels.
- One-handed mobile use for capture flows.
- Responsive images, lazy loading, cached search.
- Calm loading, empty and error states.
- Must work well with a realistic collection (200+ games, 1,000+ plays). Seed data for this.

## 8. Visual direction

Premium collection catalogue + editorial journal. "Night Wall" (ADR-0010): one dark theme, one light accent, colour from the covers. Cover art first. Expressive display type + readable sans. Whitespace, restrained metadata, subtle motion. No dashboard look, bright primaries, badge clutter, dense stats. Details in `.claude/skills/design-system/SKILL.md`.

## 9. Scope

**P0 (first usable release):** auth + private workspace · catalogue search + manual games · collection statuses · cover art, metadata, search, filters · gallery, shelf, table views · game detail · overall + optional dimension ratings · notes and dated assessments · play logging and history · Quick Capture · drafts and editing · basic import/export · multi-user isolation · responsive.

**P1:** campaigns and playthroughs · scenario history and progress · next-session notes · expansions as relationships · personal tags and custom shelves · richer mechanics · photos and attachments.

**P2:** insights · personal comparisons · public profiles and shared collections · optional public reviews · social discovery · commercial features if justified.

**Out of scope:** recreating BGG · social feed, comments, followers, messaging · token-level inventory · AI-generated reviews · native apps · microservices.

## 10. Open product questions

Tracked in `STATUS.md` → Open questions. Resolved ones become ADRs.
