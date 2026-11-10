# Roadmap and Backlog

Tick items when verified (see Definition of done in `CLAUDE.md`). Each item is meant to be one vertical slice or less. Estimates are planning guesses for one developer with AI help.

## Phase 0: Foundation (3-5 days)

- [x] F0.1 Claude harness: CLAUDE.md, agents, skills, hooks, MCP config
- [x] F0.2 Docs: PRODUCT_SPEC, ARCHITECTURE, ROADMAP, STATUS, ADR template
- [x] F0.3 Catalogue provider research (BGG XML API2 and alternatives): access, registration, rate limits, caching, image rights, attribution. Output: ADR.
  - AC: ADR lists sources with links; clear yes/no on caching metadata and images.
  - Done 2026-10-30: ADR-0003 Accepted. BGG pages read. BGG deferred; manual provider only for now.
- [x] F0.4 Resolve open questions in STATUS.md that affect the schema (rating model, provider). Output: ADRs.
- [x] F0.5 Low-fidelity wireframes: Home, Library, Game Detail, Quick Capture (desktop + mobile).
  - AC: user approved the wireframes.
- [x] F0.6 Scaffold: Next.js + TS strict + Tailwind + ESLint + Prettier + Vitest + Playwright + Supabase CLI. Update CLAUDE.md commands.
  - AC: `npm run lint`, `typecheck`, `test`, `test:e2e` all run green on an empty app.
- [x] F0.7 Design tokens + fonts + base layout (nav, Quick Capture button, light/dark).
  - AC: design-reviewer has no blocking findings.
  - Done 2026-11-02: blocking findings fixed. Last fix verified by e2e, reviewer not re-run.
- [x] F0.8 CI on GitHub Actions (lint, typecheck, unit, integration with Supabase, e2e).
  - Done 2026-11-02: first GitHub Actions run green (checks, integration, e2e). Run 41419710580.
- [x] F0.9 Initial migrations: profiles, games, game_editions, game_images, collection_entries + RLS + isolation tests.
  - AC: two-user isolation test passes; db-security-reviewer has no blocking findings.
  - Done 2026-11-02: verified locally and CI green on GitHub (all three jobs).
- [x] F0.10 **First slice**: sign in → add a game manually → it is stored in my collection → it shows in the gallery.
  - AC: e2e passes on desktop and mobile projects; screenshot reviewed.
  - Done 2026-11-02: verified locally and CI green on GitHub (all three jobs).

Exit: data model, design direction and first slice validated.

Phase 0 closed 2026-11-04.

## Phase 1: Library MVP (1-2 weeks)

- [ ] L1 Auth: magic link, private workspace, sign-up restricted (allowlist).
- [ ] L2 Catalogue search via provider + pick edition + add with status. Manual fallback when provider fails.
  - AC: provider timeout shows fallback; duplicate external id never creates a second game.
  - Prepared 2026-11-03 by the duplicate warning: reuse `normalizeTitle`, `findTitleMatches` and the `add_game_copy` function for games already held.
- [x] L3 Collection status changes (any transition, history kept).
  - AC: every change is recorded with from and to status and a date (today by default, or a date the person sets, not in the future); history is visible on the game page and cannot be edited by the person; a status cannot change without a history row; two-user isolation tests pass. See ADR-0009.
  - Done 2026-11-02: verified locally. CI run on GitHub pending the push.
- [x] L4 Library views: gallery, shelf, table. Search, filters (status, players, time, mechanics), sort.
  - AC: works with seeded 250 games; filter state in URL.
  - Built 2026-11-03: gallery, shelf and table; title search; filters for status, players and play time; sort by recently added or title; 48 per page; state in the URL. Not built yet: the mechanics filter (no mechanics data until a provider or editing exists), sorting by rating or last played (L6, Phase 2). Add them when the data exists.
- [x] L4b Remove from library: archive (keeps history), restore, Archived filter, and permanent delete of an archived copy when nothing is attached. ADR-0011.
  - Done 2026-11-04: verified locally. CI run on GitHub pending the push.
- [ ] L5 Game detail dossier (cover, metadata, status, acquisition, rating, notes).
  - Started 2026-11-02: the game page, editing facts (year, players, play time, description) and changing the current status are built and verified. Cover art is now L5b (done). Still open for L5: acquisition details, rating (L6) and notes (L7).
- [x] L5b Cover upload: add, replace and remove a cover image on the game page (your own photo).
  - AC: the cover shows on the game page and the Library card; only the owner can see it; photo metadata (GPS) is stripped; wrong or oversized files show a clear error; replacing never leaves a game without a cover; two-user isolation tests for the storage bucket pass.
  - Done 2026-11-02: verified locally. CI run on GitHub pending the push.
- [x] L6 Overall rating as dated assessments; current = latest. (Dimension scores were dropped on 2026-11-04, see ADR-0012.)
  - AC: new assessment never overwrites old; history visible.
  - Done 2026-11-04: verified locally (ADR-0012). CI run on GitHub pending the push. Library sort by rating is not built yet.
- [x] L7 Thoughts: free-form notes on a game (light Markdown), each tagged with one or more topics (parts of the game). Concept: topic notebook, Option B (approved), in `docs/design-concepts/thoughts/`. ADR-0013.
  - Done 2026-11-04: verified locally. CI run on GitHub pending the push. Included in the export (L8).
- [x] L8 Export foundation: full JSON export of my data, and import into an empty account. Concept: Option A, inline "Your data" section in Settings (approved), in `docs/design-concepts/export/`. ADR-0014.
  - AC: export → import into empty account round-trips (test).
  - Done 2026-11-10: verified locally (round-trip test in `tests/integration/data-export.test.ts`). CI run on GitHub pending the push. Covers are not in the file; CSV waits for J7.

Exit: the whole collection can be represented and maintained.

## Phase 2: Journal (1-2 weeks)

- [ ] J1 Log a play (date today by default, optional fields) from game page.
- [ ] J2 Quick Capture global sheet: add game, log play, capture thought.
  - AC: timed e2e on known game under target steps; keyboard shortcut opens it.
- [ ] J3 Journal timeline (plays + thoughts), searchable.
- [ ] J4 Structured assessments UI with history and before/after expectations.
- [ ] J5 Draft recovery for all text entry.
  - AC: e2e: type, navigate away, return, text restored.
- [ ] J6 Edit and delete for plays, thoughts, assessments (with undo where cheap).
- [ ] J7 CSV export (collection, plays).

Exit: logging plays and thoughts is fast enough for daily use.

## Phase 3: Campaigns (1-2 weeks, P1)

- [ ] C1 Campaigns and playthroughs per game.
- [ ] C2 Campaign sessions linked to play sessions; scenario history and progress.
- [ ] C3 Next-session notes and "resume campaign" view.
  - AC: resume view shows last session, progress and next-session notes in one screen.
- [ ] C4 Expansion relationships.
- [ ] C5 Personal tags and custom shelves.
- [ ] C6 Photos and attachments (private storage).

## Phase 4: Insights and hardening (1-3 weeks)

- [ ] H1 Insights: rating trends, mechanic preferences, play frequency.
- [ ] H2 Personal comparisons.
- [ ] H3 Accessibility audit and performance pass.
- [ ] H4 Security review (full RLS audit, dependency audit).
- [ ] H5 Backup restore test, documented.
- [ ] H6 PWA install.
- [ ] H7 Decide on public sharing / multi-user beta (ADR).
