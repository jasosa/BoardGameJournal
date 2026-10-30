# ADR-0002: Claude development harness

- Status: Accepted
- Date: 2026-10-30

## Context

Claude Code does most of the implementation. We need it to follow the architecture, keep data private, keep the visual identity, and report honestly.

## Decision

- `CLAUDE.md` holds project rules, short and always loaded.
- `.claude/settings.json`: allow common dev commands, ask before installs/pushes/remote DB, deny reading env files and force pushes.
- Hooks (Node, cross-platform): block env file writes, service role in client code, edits of committed migrations, risky shell commands; auto-format with Prettier; load STATUS.md at session start.
- Subagents: `db-security-reviewer`, `design-reviewer`, `dod-verifier` (read-only reviewers).
- Skills: `vertical-slice`, `db-migration`, `design-system`, `catalogue-provider`, `adr`, `wrap-up`.
- MCP: Playwright (visual checks), Context7 (current library docs). Supabase MCP optional, read-only, once a project exists.
- Cowork is used for planning, research and design reviews; the repo docs are the source of truth.

## Consequences

- Harness must be kept current (commands in CLAUDE.md after scaffold).
- Hooks are guards, not a security boundary. RLS and review still matter.
