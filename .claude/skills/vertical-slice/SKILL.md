---
name: vertical-slice
description: Step-by-step workflow to build one complete feature slice (schema, RLS, domain logic, validation, tests, UI, e2e, docs). Use whenever starting a new feature or roadmap item.
---

# Build one vertical slice

A slice is one user-visible capability end to end, for example "add a game to my collection and see it in the library". Keep it small. Finish it fully before starting another.

## UI concept gate (before step 0 is final)
- If the slice changes the UI, run the `ux-concept` agent first. Show its concept to the user and wait for approval. No UI code before that.
- Build exactly the approved concept plus the user's comments. Ask before changing anything. Compare the built screens with the concept at the end and list differences.

## 0. Frame it
- Find the item in `docs/ROADMAP.md`. Copy its acceptance criteria into your plan.
- Write the plan (plan mode): user story, files to touch, schema change, domain function signatures, tests, screens and states.
- List decisions you are making. Reversible and minor: decide and note in STATUS.md. Affects data integrity or architecture: stop and ask, then write an ADR.

## 1. Data
- New migration (`db-migration` skill). Tables, constraints, indexes, RLS policies.
- `npx supabase db reset` locally, then `npx supabase gen types typescript --local > src/lib/database/types.ts`.

## 2. Domain
- Zod schemas in `src/lib/schemas` or the feature folder. Types inferred from them.
- Pure domain functions in `src/features/<feature>/` (no React, no Next imports).
- Service in `src/server/services/` that does: get user from session, validate, authorise, call DB, return a typed result `{ ok: true, data } | { ok: false, error }`.
- Server action in `src/app/...` is a thin wrapper around the service.

## 3. Tests first for the rules
- Vitest unit tests for domain rules.
- Integration test against local Supabase: happy path + RLS isolation with two users.

## 4. UI
- Components in `src/components/<area>/`, tokens only, follow the `design-system` skill.
- All four states: loading, empty, error, success. Optimistic update where safe, with rollback on error.
- Forms: keyboard friendly, labels, draft saved locally if text can be lost.

## 5. E2E
- Playwright test for the main flow, run in a desktop and a mobile project.
- Look at it yourself with the Playwright MCP at 1280px and 390px.

## 6. Verify and record
- `npm run lint && npm run typecheck && npm test && npm run test:e2e`
- Run `db-security-reviewer` if schema/auth changed, `design-reviewer` if UI changed, then `dod-verifier`.
- Fix findings. Then `wrap-up` skill: update STATUS.md, commit.
