# Project Status

Last updated: 2026-11-02

## Now

- Phase 0: Foundation.
- Phase 0 slices are built: harness, docs, wireframes, scaffold, app shell, CI, first schema, and the first slice (sign in, add a game by hand, see it in the Library gallery). CI is green on GitHub for all of it. Waiting for the Phase 0 exit review.

## Next

1. Set branch protection on `main` in GitHub (require the three CI jobs). Manual, done by the user.
2. Phase 0 exit review with the user: data model, design direction and first slice validated. Then plan Phase 1 from `docs/ROADMAP.md`.

## Open questions

None.

## Decisions

- [ADR-0001](adr/0001-stack-and-modular-monolith.md) Stack and modular monolith (Accepted)
- [ADR-0002](adr/0002-claude-development-harness.md) Claude development harness (Accepted)
- [ADR-0003](adr/0003-catalogue-provider.md) Catalogue provider: interface + ManualProvider only for now, BGG deferred (Accepted)
- [ADR-0004](adr/0004-rating-model.md) Rating model: dated assessments, overall 0-10 plus optional dimensions (Accepted)
- [ADR-0005](adr/0005-journal-editing-and-drafts.md) Journal editing: textarea + light Markdown, local drafts, no offline sync (Accepted)
- [ADR-0006](adr/0006-private-access-allowlist.md) Private access with sign-up allowlist (Accepted)
- [ADR-0007](adr/0007-hosting.md) Hosting: Vercel + Supabase cloud, free tiers (Accepted)
- [ADR-0008](adr/0008-sign-in-and-account-creation.md) Email and password sign-in, accounts created by script (Accepted)

## Tech debt

- Auth config (`supabase/config.toml`): `[auth] enable_signup = false` blocks public sign-up; `[auth.email] enable_signup = true` is needed so password login works (false disables the whole email provider). The hosted Supabase project must match: "Allow new users to sign up" off, email provider on. Check before the first deploy. The allowlist mechanism is still to be chosen in F0.10.
- Accepted risk (2026-11-02): `npm audit` reports 17 moderate findings in dev dependencies. All come from one advisory, a `minimatch` denial of service (GHSA-g3hv-75wg-m249), pulled in by the ESLint toolchain. Dev only, not shipped. `npm audit --omit=dev` finds 0. Do not run `npm audit fix --force` (it downgrades eslint to 4.0.0). CI (F0.8) gates on `npm audit --omit=dev`. Revisit when `eslint` or `eslint-config-next` updates `minimatch`.
- Template defaults left out on purpose: `cacheComponents` and `partialPrefetching` in `next.config.ts`. Revisit when data fetching starts.

- UI gaps left from the F0.7 design review: no favicon (404 in console), no `loading.tsx`, `error.tsx` or `not-found.tsx`, no icons in the bottom nav. `--color-ink-faint` is 3.3:1 on paper in light, so use it only for non-text or large text.
- Dark token values are duplicated in `tokens.css` (explicit `data-theme` block and the media query block). Keep both in sync.
- shadcn/ui not set up yet. Add it when Quick Capture needs a sheet or dialog.


- Review leftovers (non-blocking): when storage lands, tie `game_images.storage_path` to a private bucket with a per-user prefix policy. If private games are ever shared, account deletion can fail on `collection_entries.game_id` (no action) when another user's collection references them; handle in the sharing ADR. The `supabase_admin` default privileges still grant `anon` on new objects created by that role; our migrations run as `postgres`, which is locked down.

- Login rate limit: Supabase counts sign-in attempts per IP, and the login action runs on our server, so the limit applies to the server, not the visitor. One abuser could lock the owner out, and there is no per-visitor brute-force limit. Add a per-IP/per-email limit in the action and a "too many attempts" message before hosting.
- Password rules: local `minimum_password_length` is 6. Raise to 12 or more before the password change and reset flow (ADR-0008).
- Duplicate titles are not detected yet. The wireframe shows "Already in your library" when typing a title that exists. Adding the same title twice creates two games.
- Library cards have no cover slot yet, no link to a game page, and no success cue after saving (the new card is the confirmation). No favicon (404 in the console), no `error.tsx` or `not-found.tsx` yet. Long titles clamp at 5 lines.
- Services are not marked `server-only` (callers pass the client in). Optional hardening.
- The proxy matcher skips paths ending in image extensions. `requireUser` must stay the real gate on any such route.

## Migration notes

- `20261102124840_add_manual_game_function.sql` (F0.10): adds `add_manual_game(title, status)` (security invoker, authenticated only) and a 200 character limit on `games.name`. Rollback locally: drop the function and the `games_name_length` constraint, delete the file, `npx supabase db reset`. No data depends on it.
- `20261102103909_initial_schema.sql` (F0.9): creates `profiles`, `games`, `game_editions`, `game_images`, `collection_entries`, two functions and a trigger on `auth.users`. No data existed before. Rollback locally: delete the file and run `npx supabase db reset`. Once real data exists, write a new migration instead, never edit this one. No hosted project yet, so nothing to apply remotely.

## Done

- 2026-10-30 F0.1 Claude harness created (CLAUDE.md, .claude/settings.json, hooks, 3 agents, 6 skills, .mcp.json). Hooks tested locally with sample inputs.
- 2026-10-30 F0.2 Docs created from handover.
- 2026-10-30 F0.3 Catalogue provider research. ADR-0003 Accepted. Both BGG pages verified from user pastes (our fetch tool got 403). Decision: start without BGG, `ManualProvider` only. If BGG is added later: cache metadata, hotlink images only, keep data unmodified. Not tested or confirmed beyond that.
- 2026-10-30 F0.4 Open questions Q2 to Q6 resolved with the documented defaults (user accepted all). ADR-0004 to ADR-0007. Docs only, nothing run. Note: Supabase free projects can pause when idle; check before storing real data.
- 2026-10-30 F0.5 Wireframes approved by the user. Seven static greyscale pages in `docs/wireframes/` (Home, Library, Game detail, Quick Capture, Journal, Settings stub, index). Choices: top nav on desktop, bottom nav with central capture button on mobile, gallery default, stacked game detail on mobile, one Quick Capture sheet with three tabs, no quick-action row on Home. Tested: no horizontal overflow and 44px tap targets at 390px and 1280px (scripted). `design-reviewer` findings fixed but the agent was not re-run. Not tested: keyboard order, contrast, Save above the on-screen keyboard. Tap counts are estimates.
- 2026-10-31 F0.6 App scaffolded: Next.js 16.4.3 (App Router, `src/`), React 19.3.1, TypeScript strict + `noUncheckedIndexedAccess`, Tailwind 4, ESLint 9 + Prettier, Vitest 5, Playwright 1.64 (desktop 1280x800 and mobile 390x844), Supabase CLI 2.122 with `supabase/config.toml` (not started, not linked). Placeholder home page, `Result<T>` helper with 3 unit tests. Ran and green: `lint`, `typecheck`, `format:check`, `test` (3 passed), `build`, `test:e2e` (4 passed: 2 tests x 2 projects). Not run: `supabase start` (not needed yet), `dod-verifier` (scaffold, not a feature slice). See Tech debt for open points.
- 2026-11-02 F0.7 App shell: tokens (`src/lib/design-system/tokens.css`, mapped in `globals.css`), Fraunces + Inter via `next/font`, light/dark/system theme with a toggle on `/settings` (stored in `localStorage`, init script avoids flash), top nav (desktop) and bottom nav with central Quick Capture button (mobile), skip link, stub pages for Library, Journal, Settings, Capture. Light bronze darkened to `#94653a` for 4.7:1 with its button text. Ran and green: `lint`, `typecheck`, `format:check`, `test` (9 passed), `test:e2e` (21 passed, 1 skipped by design: 11 tests x 2 projects). `design-reviewer` run twice. First run had 3 blocking findings (multiple bronze accents, focus ring invisible on bronze, weak bottom-nav active state), all fixed. The second run found the bottom-nav marker still not rendering (CSS order); fixed and covered by an e2e check on the computed border colour. The reviewer was not re-run after that last fix. Not tested: mobile light theme screenshots, reduced motion in a browser, production build visual check, full keyboard sweep.
- 2026-11-02 F0.8 CI workflow written, not yet run on GitHub (no remote). `.github/workflows/ci.yml` has three jobs: `checks` (format, lint, typecheck, unit, build, `npm audit --omit=dev`), `integration` (local Supabase via `npx supabase start`), `e2e` (Playwright desktop + mobile, report uploaded on failure). Unit and integration tests are split: `npm test` is unit only, `npm run test:integration` uses `vitest.integration.config.mts` and passes with no tests until F0.9. Ran locally and green: format:check, lint, typecheck, `npm test` (9 passed), `npm run test:integration` (no files, exit 0), `build`, `npm audit --omit=dev` (0), `test:e2e` (21 passed, 1 skipped by design). Workflow YAML syntax checked with yaml-lint. Not tested: the workflow on GitHub, `actionlint`, `supabase start` and the env export step (Docker Desktop was not running).
- 2026-11-02 F0.8 verified on GitHub: first run (push of `60dd467`) green for all three jobs (`checks`, `integration`, `e2e`). Remote `origin` is github.com/jasosa/BoardGameJournal; the remote's Initial commit was merged in and the local README kept. Not verified: branch protection (not set), the Supabase env variable names against a real test.
- 2026-11-02 F0.9 Initial schema and RLS (see Migration notes). Ran and green against local Supabase: `db reset` applies cleanly, `supabase db lint` no schema errors, `npm run test:integration` 42 passed (two-user isolation for all five tables, anonymous access denied with 42501, public sign-up and OTP sign-up rejected, account deletion cascade, composite keys stop cross-game editions). Also green: lint, typecheck, format:check, `npm test` (9). Checked the tests can fail: with RLS off on `collection_entries`, 8 tests failed. `db-security-reviewer`: no blocking findings; its should-fix items (provider-id squatting on editions, cross-game edition links, extra table privileges, default privileges for `anon`) were fixed and tested. `dod-verifier` passed everything applicable; its only fail (this note) is now written. Changed `config.toml` `[auth.email] enable_signup` to true (see Tech debt). Generated types in `src/lib/database/types.ts` (regenerate after each migration). Not verified: the CI run with this migration (not pushed), the hosted project, e2e and build (no UI change).
- 2026-11-02 F0.10 First slice: email + password sign-in (ADR-0008), Add a game form on `/capture`, Library gallery with empty, error and loading states, Sign out in Settings, `npm run user:create`. Ran and green locally: lint, typecheck, format:check, build, `npm test` (19 passed), `npm run test:integration` (48 passed), `npm run test:e2e` (41 passed, 1 skipped by design, desktop and mobile). E2E covers: signed-out redirect, wrong password and unknown email (same message), sign in and out, forged session cookie rejected, httpOnly session cookie, add two games and see them newest first with status, blank-title error tied to the Title field, another account does not see my games. Reviews: `design-reviewer` no blocking findings (fixed: email kept after failed sign-in, error tied to field, one bronze accent on the Add game form, skip link position). `db-security-reviewer` no blocking findings (fixed: session cookie now httpOnly and secure in production; added `requireUser` unit tests and a forged-cookie e2e; the rest is under Tech debt). Screenshots of the Library with four games reviewed by me and by the design reviewer at 1280 and 390 (light), plus the reviewer's light/dark set of login, Add game, Library and Settings (mobile light Settings not viewed). They were saved outside the repo and are not committed. The e2e log shows `@supabase/ssr: chunked cookie decoded to invalid JSON` warnings only from the forged-cookie test, on purpose. Not verified: CI on GitHub for this change (not pushed), hosted Supabase, a real phone.
- 2026-11-02 CI verified on GitHub: pushes of `3a7f9a1` (F0.9) and `b8a9e2c` (F0.10) both green for `checks`, `integration` and `e2e`. The user also ran the app locally (supabase start, `npm run user:create`, `npm run dev`, sign in) and confirmed it works.
