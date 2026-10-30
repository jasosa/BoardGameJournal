# Meeple Journal (working title)

A personal board-game library and journal. Responsive web app (PWA later) for one user first, built so it can become multi-user.

Guiding principle: **a personal gaming journal that happens to manage a collection**, not a collection manager with notes.

## Read first

- `docs/STATUS.md` - where we are, what is next, open questions. Read at the start of every session.
- `docs/PRODUCT_SPEC.md` - requirements, principles, MVP scope (P0/P1/P2, out of scope).
- `docs/ARCHITECTURE.md` - stack, module boundaries, schema, security model.
- `docs/ROADMAP.md` - phased backlog with acceptance criteria.
- `docs/adr/` - architecture decisions. Check before changing anything they cover.
- `docs/HANDOVER.md` - original handover. Source of truth if docs disagree, unless an ADR says otherwise.

## Stack

Next.js (App Router) + React + TypeScript (strict) · Tailwind CSS + selected shadcn/ui primitives · Supabase (Postgres, Auth, Storage) · Zod · Vitest · Playwright. Modular monolith. No microservices, no separate search cluster, no event streaming.

## Commands

Not scaffolded yet. When the app is scaffolded, replace this list with the real scripts and keep it current.

- `npm run dev` - dev server
- `npm run lint` / `npm run typecheck`
- `npm test` - Vitest (domain + integration)
- `npm run test:e2e` - Playwright
- `npx supabase start` / `npx supabase db reset` - local database (needs Docker Desktop)
- `npx supabase migration new <name>` - new migration

## Code layout

```
src/app/          routes, layouts, server actions entry points (thin)
src/components/   presentational UI by area: library, game, capture, journal, campaign
src/features/     domain modules: catalogue, collection, plays, campaigns, assessments, attachments, identity
src/server/       catalogue-providers, authorization, validation, services
src/lib/          database client, shared zod schemas, design-system tokens
supabase/migrations/  SQL migrations (the only way to change the schema)
tests/            e2e and cross-module tests
```

Rules:
- Domain logic lives in `src/features/*` and `src/server/services`, never in components or route files.
- One validated operation per use case. "Log a play" is the same function from Quick Capture, game page or campaign screen.
- Zod schema at every boundary (form, server action, provider response). Types come from schemas.
- Catalogue providers only through the `BoardGameCatalogueProvider` interface. The app must work when the provider is down.

## Data and security rules (non-negotiable)

- Catalogue identity (`games`, `game_editions`) is separate from personal records (`collection_entries`, `play_sessions`, `assessments`, `journal_entries`, `campaigns`).
- Every personal table has `user_id`, RLS enabled, and owner-only policies. A migration that adds a personal table without RLS is a bug.
- Every new personal table gets an RLS isolation test with two users.
- Authorise on the server. The UI hiding something is not security.
- Never use the service role key in client code or in anything imported by a client component. It lives only in server-only modules.
- Never read, print or commit `.env*` files with real secrets. `.env.example` holds names only.
- UUID primary keys. Schema changes only through migrations, never by hand in the dashboard.
- Assessments are dated history: insert new rows, do not overwrite. Current rating is derived.
- Selling or removing a game never deletes plays, assessments or journal entries.
- Keep provenance and attribution for imported catalogue data and images. No scraping without verified terms.

## Visual direction

Premium collection catalogue + editorial journal. Warm off-white, cream, charcoal, restrained bronze. Cover art is the hero. Expressive display type + readable sans. Generous whitespace. Subtle motion. No generic dashboard look, no bright primaries, no badge soup. Use tokens from `src/lib/design-system`, never hard-coded colours or spacing. See the `design-system` skill.

## How we work

1. Start: read `docs/STATUS.md`. Confirm the next slice with the user if unclear.
2. Plan before coding anything non-trivial (use plan mode). Name the files, the schema change, and the tests.
3. Build **one vertical slice at a time** (schema → RLS → domain + validation → tests → UI → e2e). Use the `vertical-slice` skill.
4. Run lint, typecheck and tests after each significant change. Fix failures before moving on.
5. Check UI on desktop (1280px) and mobile (390px) with Playwright before calling UI work done.
6. Before calling a feature done, run the `dod-verifier` agent. For migrations or auth changes, run `db-security-reviewer`. For UI, run `design-reviewer`.
7. End: update `docs/STATUS.md` (use the `wrap-up` skill). Record decisions as ADRs (`adr` skill).
8. Small commits with clear messages. Do not push or force-push unless asked.

Report honestly: say what was tested and what was not. Never claim something works without running it.

## Definition of done

Data model + validation · server-side authorisation verified · loading / empty / error / success states · desktop and mobile layout · keyboard and accessible labels · automated tests for domain rules · no regressions · no secrets exposed · migration and recovery notes in STATUS.md when relevant.

## Scope guard

Do not build P1/P2 or out-of-scope features (social feed, BGG clone features, AI reviews, native apps, full offline sync) unless the user asks. If something seems needed, propose it and add it to STATUS.md open questions.

## Writing style for docs and messages

Plain, direct English. Short sentences. No em-dashes.
