# Project Status

Last updated: 2026-10-31

## Now

- Phase 0: Foundation.
- Harness, docs, wireframes and the app scaffold are in place. The app is a placeholder home page.

## Next

1. F0.7 Design tokens, fonts, base layout (nav, Quick Capture button, light/dark).
2. F0.8 CI. F0.9 first migrations. F0.10 first slice.

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

- `supabase/config.toml` still has the init defaults: `[auth] enable_signup = true` and `[auth.email] enable_signup = true`. ADR-0006 wants public sign-up off. Decide the allowlist mechanism in the identity slice (F0.10), then change this and the hosted project settings.
- `npm install` reports 17 moderate audit findings in dev dependencies. Not reviewed yet. Check before F0.8 CI.
- `next dev` writes `AGENTS.md` (Next.js agent notes). Committed because it is regenerated on every dev run. Remove it if it conflicts with CLAUDE.md.
- Template defaults left out on purpose: `cacheComponents` and `partialPrefetching` in `next.config.ts`. Revisit when data fetching starts.

## Migration notes

- None yet.

## Done

- 2026-10-30 F0.1 Claude harness created (CLAUDE.md, .claude/settings.json, hooks, 3 agents, 6 skills, .mcp.json). Hooks tested locally with sample inputs.
- 2026-10-30 F0.2 Docs created from handover.
- 2026-10-30 F0.3 Catalogue provider research. ADR-0003 Accepted. Both BGG pages verified from user pastes (our fetch tool got 403). Decision: start without BGG, `ManualProvider` only. If BGG is added later: cache metadata, hotlink images only, keep data unmodified. Not tested or confirmed beyond that.
- 2026-10-30 F0.4 Open questions Q2 to Q6 resolved with the documented defaults (user accepted all). ADR-0004 to ADR-0007. Docs only, nothing run. Note: Supabase free projects can pause when idle; check before storing real data.
- 2026-10-30 F0.5 Wireframes approved by the user. Seven static greyscale pages in `docs/wireframes/` (Home, Library, Game detail, Quick Capture, Journal, Settings stub, index). Choices: top nav on desktop, bottom nav with central capture button on mobile, gallery default, stacked game detail on mobile, one Quick Capture sheet with three tabs, no quick-action row on Home. Tested: no horizontal overflow and 44px tap targets at 390px and 1280px (scripted). `design-reviewer` findings fixed but the agent was not re-run. Not tested: keyboard order, contrast, Save above the on-screen keyboard. Tap counts are estimates.
- 2026-10-31 F0.6 App scaffolded: Next.js 16.4.3 (App Router, `src/`), React 19.3.1, TypeScript strict + `noUncheckedIndexedAccess`, Tailwind 4, ESLint 9 + Prettier, Vitest 5, Playwright 1.64 (desktop 1280x800 and mobile 390x844), Supabase CLI 2.122 with `supabase/config.toml` (not started, not linked). Placeholder home page, `Result<T>` helper with 3 unit tests. Ran and green: `lint`, `typecheck`, `format:check`, `test` (3 passed), `build`, `test:e2e` (4 passed: 2 tests x 2 projects). Not run: `supabase start` (not needed yet), `dod-verifier` (scaffold, not a feature slice). See Tech debt for open points.
