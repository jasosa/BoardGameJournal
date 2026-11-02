# Project Status

Last updated: 2026-11-02

## Now

- Phase 0: Foundation.
- Harness, docs, wireframes, scaffold and the app shell (tokens, fonts, nav, light/dark) are in place. Pages are stubs with empty states.

## Next

1. Set branch protection on `main` in GitHub (require the three CI jobs). Manual, done by the user.
2. F0.9 first migrations (needs Docker Desktop running).
3. F0.10 first slice.

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

## Tech debt

- Local `supabase/config.toml` has public sign-up off (`[auth]` and `[auth.email]`). The hosted project must be set the same way when it exists. The user confirmed we need real users and a login page (ADR-0006 stands). The allowlist mechanism is still to be chosen in F0.10.
- Accepted risk (2026-11-02): `npm audit` reports 17 moderate findings in dev dependencies. All come from one advisory, a `minimatch` denial of service (GHSA-g3hv-75wg-m249), pulled in by the ESLint toolchain. Dev only, not shipped. `npm audit --omit=dev` finds 0. Do not run `npm audit fix --force` (it downgrades eslint to 4.0.0). CI (F0.8) gates on `npm audit --omit=dev`. Revisit when `eslint` or `eslint-config-next` updates `minimatch`.
- Template defaults left out on purpose: `cacheComponents` and `partialPrefetching` in `next.config.ts`. Revisit when data fetching starts.

- UI gaps left from the F0.7 design review: no favicon (404 in console), no `loading.tsx`, `error.tsx` or `not-found.tsx`, no icons in the bottom nav. `--color-ink-faint` is 3.3:1 on paper in light, so use it only for non-text or large text.
- Dark token values are duplicated in `tokens.css` (explicit `data-theme` block and the media query block). Keep both in sync.
- shadcn/ui not set up yet. Add it when Quick Capture needs a sheet or dialog.

- CI integration job exports Supabase values with `supabase status -o env` using the CLI default names (`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DB_URL`). The step ran without error in CI, but no test reads the values yet. Confirm the names when F0.9 adds the first real integration tests.

## Migration notes

- None yet.

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
