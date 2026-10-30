# ADR-0007: Hosting

- Status: Accepted
- Date: 2026-10-30

## Context

Open question Q6. We need cheap, managed hosting for a Next.js app and a Postgres database, with preview environments. Stack is set in ADR-0001.

## Options

1. Vercel for the app, Supabase cloud for database, auth and storage, on free tiers. Least ops, matches the stack.
2. Self-hosted on a VPS. More control, more upkeep, no benefit now.
3. Another managed Next.js host. Possible, but gives no advantage for this stack.

## Decision

Option 1. Start on free tiers.

- Local: Supabase CLI with Docker Desktop.
- Preview: Vercel preview with a staging Supabase project.
- Production: one Supabase project, private (ADR-0006).
- Schema changes only through migrations. Secrets only in host env vars.

## Consequences

- Free tiers have limits, and Supabase free projects can pause when idle. Check this before relying on production for real data.
- Backups and a tested restore procedure are needed before storing data that matters. Plan this in Phase 4 and note it in STATUS.md.
- Moving host later is possible, since the app is a standard Next.js app on Postgres.
