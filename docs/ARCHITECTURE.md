# Architecture: Meeple Journal

Status: v0.1 draft. Schema below is a proposal until the first migrations land. Decisions in `adr/`.

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript strict |
| Styling | Tailwind CSS v4 with design tokens; shadcn/ui primitives, restyled |
| Data | Supabase Postgres, migrations in `supabase/migrations` |
| Auth | Supabase Auth (email magic link to start; OAuth later) via `@supabase/ssr` |
| Storage | Supabase Storage, private buckets, per-user paths |
| Validation | Zod at every boundary; React Hook Form (or native forms + server actions) |
| Tests | Vitest (unit + integration on local Supabase), Playwright (desktop + mobile projects) |
| Hosting | Vercel (or similar managed Next.js) + Supabase cloud |
| CI | GitHub Actions: lint, typecheck, unit, integration with Supabase CLI, e2e |

Modular monolith. No microservices, search cluster or event streaming. Postgres full-text search (`tsvector`) and `pg_trgm` cover search needs.

## 2. Module boundaries

```
src/app            routes + server actions (thin: parse, call service, revalidate)
src/components     UI only, no data access
src/features/*     domain: types, pure rules, schemas per module
src/server/services       use cases: auth → validate → authorise → persist
src/server/authorization  helpers: requireUser(), ownership checks
src/server/catalogue-providers  provider interface + implementations + fixtures
src/lib/database   supabase clients (browser, server, admin [server-only]), generated types
src/lib/schemas    shared Zod schemas
src/lib/design-system  tokens.css, fonts, primitives
```

Rules:
- Dependency direction: app → components/services → features → lib. Features never import from app or components.
- One use case = one service function. Quick Capture, game page and campaign screen call the same `logPlay()`.
- Services return `Result<T>` (`{ ok: true, data } | { ok: false, error: { code, message } }`), never throw for expected errors.
- The admin (service role) client is only in `src/lib/database/admin.ts` with `import "server-only"`, used only for provider imports and maintenance jobs.

## 3. Data model (proposal)

Catalogue (shared identity)
- `games` (id, name, sort_name, year, description, min/max players, play time, weight, kind `base|expansion|standalone_expansion`, source, external_id, source_url, attribution, fetched_at, created_by nullable, visibility `public|private`) · unique (source, external_id)
- `game_editions` (id, game_id, name, publisher, year, language, source, external_id)
- `game_images` (id, game_id, edition_id nullable, storage_path or url, width, height, kind, attribution, licence)
- `game_relationships` (from_game_id, to_game_id, kind `expands|reimplements|integrates`) (P1)
- `mechanics`, `game_mechanics`

Personal (all have `user_id`, RLS owner-only)
- `collection_entries` (game_id, edition_id, status, acquired_on, price, currency, source, notes, sold_on). One game can have several entries (copies) per user.
- `play_sessions` (game_id, edition_id, played_on, duration_min, player_count, is_solo, outcome, score, notes, campaign_session_id nullable)
- `play_participants` (play_session_id, name, is_me, score, winner) (simple names, no social graph)
- `assessments` (game_id, assessed_on, overall numeric(3,1), summary, context `expectation|after_play|revisit`)
- `assessment_scores` (assessment_id, dimension, score)
- `journal_entries` (game_id nullable, play_session_id nullable, campaign_id nullable, tone `positive|negative|observation` nullable, body markdown, created_at, updated_at)
- `campaigns`, `campaign_sessions` (P1; typed fields for scenario, outcome, next_session_notes; `state jsonb` for game-specific data)
- `personal_tags`, `game_tags` (P1)
- `attachments` (P1; owner, target_type, target_id, storage_path)
- `profiles` (user_id, display_name, preferences jsonb)

Derived
- `current_ratings` view (latest assessment per user+game), `security_invoker = true`.

Key rules (from handover §9): game ≠ edition ≠ copy · selling never deletes history · casual plays need no campaign · assessments are dated history · mechanics ≠ tags · expansions are relationships · JSONB only for variable state · manual catalogue records supported.

## 4. Security model

- RLS on every table. Personal tables: owner-only for all operations (`(select auth.uid()) = user_id`).
- Catalogue: authenticated users read public rows and their own private manual rows. Provider rows written only by the server.
- Server actions always derive the user from the session cookie. Never trust `user_id` from the client.
- Visibility is explicit. Nothing personal is public in P0. Public features (P2) will use separate views that expose only chosen columns.
- Storage: private buckets; paths `user_id/...`; policies check the first path segment.
- Secrets: only in env vars; `.env.example` lists names. Claude hooks block writing env files and service role keys in client code.
- Export: JSON (full, version 1, nested per game) built on the server for the signed-in user. CSV (collection, plays) comes with the journal export (J7). Import: the same JSON, only into an empty account, in one transaction through `import_account()` (ADR-0014). A BGG collection CSV importer only if terms allow.
- Backups: Supabase daily backups + a tested restore procedure (Phase 4), documented in STATUS.md.
- Account deletion removes all personal rows and storage objects.

## 5. Catalogue integration

- Interface `BoardGameCatalogueProvider { searchGames(query); getGame(externalId) }`.
- Implementations: `ManualProvider` (always on), BGG XML API2 candidate (needs terms check: registration, rate limits, caching and image rules; see ROADMAP Phase 0).
- Cache provider results in `games` with provenance. Image caching only if terms allow; otherwise hotlink with attribution or store none.
- Timeouts and graceful failure. The app works with the provider down.

## 6. Frontend patterns

- Server Components for reads, server actions for writes, `useOptimistic` for safe updates.
- Drafts: local storage keyed by form + target id, cleared on successful save.
- Images: `next/image` with configured remote patterns, fixed aspect ratios, blur placeholder.
- Library list: server pagination; virtualise only if needed (measure first).

## 7. Environments

- Local: Supabase CLI (Docker Desktop) + `npm run dev`. Seed script with a realistic collection.
- Preview: Vercel preview + Supabase branch or a staging project.
- Production: private, invite-only sign-up until a multi-user beta is decided.
