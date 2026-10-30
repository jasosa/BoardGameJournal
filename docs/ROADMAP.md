# Roadmap and Backlog

Tick items when verified (see Definition of done in `CLAUDE.md`). Each item is meant to be one vertical slice or less. Estimates are planning guesses for one developer with AI help.

## Phase 0: Foundation (3-5 days)

- [x] F0.1 Claude harness: CLAUDE.md, agents, skills, hooks, MCP config
- [x] F0.2 Docs: PRODUCT_SPEC, ARCHITECTURE, ROADMAP, STATUS, ADR template
- [x] F0.3 Catalogue provider research (BGG XML API2 and alternatives): access, registration, rate limits, caching, image rights, attribution. Output: ADR.
  - AC: ADR lists sources with links; clear yes/no on caching metadata and images.
  - Done 2026-10-30: ADR-0003 Accepted. BGG pages read. BGG deferred; manual provider only for now.
- [x] F0.4 Resolve open questions in STATUS.md that affect the schema (rating model, provider). Output: ADRs.
- [ ] F0.5 Low-fidelity wireframes: Home, Library, Game Detail, Quick Capture (desktop + mobile).
  - AC: user approved the wireframes.
- [ ] F0.6 Scaffold: Next.js + TS strict + Tailwind + ESLint + Prettier + Vitest + Playwright + Supabase CLI. Update CLAUDE.md commands.
  - AC: `npm run lint`, `typecheck`, `test`, `test:e2e` all run green on an empty app.
- [ ] F0.7 Design tokens + fonts + base layout (nav, Quick Capture button, light/dark).
  - AC: design-reviewer has no blocking findings.
- [ ] F0.8 CI on GitHub Actions (lint, typecheck, unit, integration with Supabase, e2e).
- [ ] F0.9 Initial migrations: profiles, games, game_editions, game_images, collection_entries + RLS + isolation tests.
  - AC: two-user isolation test passes; db-security-reviewer has no blocking findings.
- [ ] F0.10 **First slice**: sign in → add a game manually → it is stored in my collection → it shows in the gallery.
  - AC: e2e passes on desktop and mobile projects; screenshot reviewed.

Exit: data model, design direction and first slice validated.

## Phase 1: Library MVP (1-2 weeks)

- [ ] L1 Auth: magic link, private workspace, sign-up restricted (allowlist).
- [ ] L2 Catalogue search via provider + pick edition + add with status. Manual fallback when provider fails.
  - AC: provider timeout shows fallback; duplicate external id never creates a second game.
- [ ] L3 Collection status changes (any transition, history kept).
- [ ] L4 Library views: gallery, shelf, table. Search, filters (status, players, time, mechanics), sort.
  - AC: works with seeded 250 games; filter state in URL.
- [ ] L5 Game detail dossier (cover, metadata, status, acquisition, rating, notes).
- [ ] L6 Overall rating + optional dimension scores as dated assessments; current = latest.
  - AC: new assessment never overwrites old; history visible.
- [ ] L7 Free-form notes on a game (markdown-lite).
- [ ] L8 Export foundation: full JSON export of my data.
  - AC: export → import into empty account round-trips (test).

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
