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

Node 24 (see `.nvmrc`). Keep this list current.

- `npm run dev` - dev server
- `npm run build` - production build
- `npm run lint` / `npm run typecheck`
- `npm run format` / `npm run format:check` - Prettier (docs, `.claude`, `supabase` are ignored)
- `npm test` - Vitest unit tests (no database needed)
- `npm run test:integration` - Vitest integration tests (needs `npx supabase start`)
- `npm run test:e2e` - Playwright, `desktop` (1280x800) and `mobile` (390x844) projects; starts the dev server itself. First run: `npx playwright install chromium`
- `npx supabase start` / `npx supabase db reset` - local database (needs Docker Desktop)
- `npx supabase migration new <name>` - new migration
- `npm run user:create -- <email>` - create an account (public sign-up is off). Needs the Supabase URL and `SUPABASE_SERVICE_ROLE_KEY` in the local env file
- `npm run covers:colours` - fill the game-page colours of covers uploaded before the colours existed (same env needs)

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

"Night Wall" (ADR-0010): a premium collection catalogue first, with an editorial journal behind it. One dark theme (canvas #121316, raised #1B1C20, warm off-white text), one light accent, no bright primaries. Cover art is the hero: covers keep their own proportions on a masonry wall, and each game page takes a tint from its cover. Schibsted Grotesk for display, Inter for body. Quiet, precise, subtle motion. No generic dashboard look, no badge soup. Use tokens from `src/lib/design-system`, never hard-coded colours or spacing. See the `design-system` skill and `docs/design-concepts/`.

## How we work

1. Start: read `docs/STATUS.md`. Confirm the next slice with the user if unclear.
2. Plan before coding anything non-trivial (use plan mode). Name the files, the schema change, and the tests.
3. **UX concept first, for every feature that changes the UI.** Before building, run the `ux-concept` agent. It prepares two or three options (desktop and phone screens, all states, behaviour and keyboard notes, a recommendation, open questions, an implementation contract). Show the concept to the user (publish it as an artifact) and wait for approval. Do not write UI code before the user approves. If a feature has no UI impact, say so and skip this step.
4. Build **one vertical slice at a time** (schema → RLS → domain + validation → tests → UI → e2e). Use the `vertical-slice` skill.
5. **Implement what was approved, plus the user's comments, and nothing else.** Every element, state, copy string and behaviour in the implementation contract is built. If something in the concept turns out to be impractical, or you want to change it, stop and ask the user first. Never swap a control or drop a detail silently. Do not cut corners: all states, keyboard, mobile, tests.
6. Run lint, typecheck and tests after each significant change. Fix failures before moving on.
7. Check UI on desktop (1280px) and mobile (390px) with Playwright before calling UI work done. Compare the built screens with the approved concept, element by element, and list every difference in the report to the user.
8. Before calling a feature done, run the `dod-verifier` agent. For migrations or auth changes, run `db-security-reviewer`. For UI, run `design-reviewer` (it also checks the build against the approved concept).
9. End: update `docs/STATUS.md` (use the `wrap-up` skill). Record decisions as ADRs (`adr` skill).
10. Small commits with clear messages. Do not push or force-push unless asked.

Report honestly: say what was tested and what was not. Never claim something works without running it.

## Definition of done

Data model + validation · server-side authorisation verified · loading / empty / error / success states · desktop and mobile layout · matches the approved UX concept (differences listed) · keyboard and accessible labels · automated tests for domain rules · no regressions · no secrets exposed · migration and recovery notes in STATUS.md when relevant.

## Scope guard

Do not build P1/P2 or out-of-scope features (social feed, BGG clone features, AI reviews, native apps, full offline sync) unless the user asks. If something seems needed, propose it and add it to STATUS.md open questions.

## Writing style for docs and messages

Plain, direct English. Short sentences. No em-dashes.
