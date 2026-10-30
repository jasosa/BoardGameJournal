# ADR-0001: Stack and modular monolith

- Status: Accepted
- Date: 2026-10-30

## Context

One developer with AI help. Needs fast iteration, strong data isolation, relational data, and a path to multi-user later.

## Options

1. Next.js + Supabase (Postgres, Auth, Storage, RLS) as a modular monolith.
2. Next.js + own API + ORM (Prisma/Drizzle) + separate auth provider.
3. SPA + backend service split.

## Decision

Option 1, as in the handover. RLS gives database-level isolation; Supabase CLI gives local dev and migrations. Single deployable app with clear module boundaries (see ARCHITECTURE.md).

## Consequences

- Security depends on correct RLS: every personal table needs policies and a two-user test.
- Some vendor coupling to Supabase. Keep data access behind `src/lib/database` and services so a move stays possible.
- No microservices, search cluster or event streaming without a new ADR.
