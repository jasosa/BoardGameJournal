# Project Status

Last updated: 2026-10-30

## Now

- Phase 0: Foundation.
- Harness and docs are in place. App not scaffolded yet.

## Next

1. F0.3 Catalogue provider research → ADR (BGG terms, caching, images).
2. F0.4 Decide open questions below that affect the schema.
3. F0.5 Wireframes, then F0.6 scaffold and F0.7 design tokens.

## Open questions

| # | Question | Default if not decided | Affects |
|---|---|---|---|
| Q1 | BGG as main provider, or provider-agnostic from day one? | Provider interface from day one; manual provider first; BGG after terms check | schema, F0.3 |
| Q2 | Rating model: overall + optional dimensions, or other? | Overall 0-10 (one decimal) + optional dimensions, dated assessments | schema |
| Q3 | Is Markdown-style editing enough at first? | Yes: plain textarea + light markdown render | J3, L7 |
| Q4 | Does local draft recovery cover the offline need? | Yes for MVP; no offline sync | J5 |
| Q5 | Stay private until a multi-user beta? | Yes: sign-up allowlist | L1, H7 |
| Q6 | Hosting: Vercel + Supabase cloud (free tiers to start)? | Yes | F0.8 |

## Decisions

- [ADR-0001](adr/0001-stack-and-modular-monolith.md) Stack and modular monolith (Accepted)
- [ADR-0002](adr/0002-claude-development-harness.md) Claude development harness (Accepted)

## Tech debt

- None yet.

## Migration notes

- None yet.

## Done

- 2026-10-30 F0.1 Claude harness created (CLAUDE.md, .claude/settings.json, hooks, 3 agents, 6 skills, .mcp.json). Hooks tested locally with sample inputs.
- 2026-10-30 F0.2 Docs created from handover.
