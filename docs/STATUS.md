# Project Status

Last updated: 2026-10-30

## Now

- Phase 0: Foundation.
- Harness and docs are in place. App not scaffolded yet.

## Next

1. F0.5 Wireframes, then F0.6 scaffold and F0.7 design tokens.

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

- None yet.

## Migration notes

- None yet.

## Done

- 2026-10-30 F0.1 Claude harness created (CLAUDE.md, .claude/settings.json, hooks, 3 agents, 6 skills, .mcp.json). Hooks tested locally with sample inputs.
- 2026-10-30 F0.2 Docs created from handover.
- 2026-10-30 F0.3 Catalogue provider research. ADR-0003 Accepted. Both BGG pages verified from user pastes (our fetch tool got 403). Decision: start without BGG, `ManualProvider` only. If BGG is added later: cache metadata, hotlink images only, keep data unmodified. Not tested or confirmed beyond that.
- 2026-10-30 F0.4 Open questions Q2 to Q6 resolved with the documented defaults (user accepted all). ADR-0004 to ADR-0007. Docs only, nothing run. Note: Supabase free projects can pause when idle; check before storing real data.
