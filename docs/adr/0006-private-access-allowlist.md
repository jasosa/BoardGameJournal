# ADR-0006: Private access with sign-up allowlist

- Status: Accepted
- Date: 2026-10-30

## Context

Open question Q5. The app is for one user first and must be able to become multi-user. Open sign-up would add abuse, support and terms work before it is needed. A private app also fits non-commercial provider terms (see ADR-0003).

## Options

1. Open sign-up from day one. Needs abuse controls and privacy work now.
2. Private, sign-up limited to an allowlist of emails. Multi-user ready, small surface.
3. Single hard-coded user, no auth model. Cheap now, costly to change later.

## Decision

Option 2.

- Supabase Auth with public sign-up off. Only allowlisted emails can create an account.
- Every personal table still has `user_id`, RLS and owner-only policies, so the data model is multi-user from the first migration.
- Nothing personal is public in P0.
- The allowlist storage mechanism (Supabase invite flow or a server-checked table) is chosen in the identity slice.

## Consequences

- Moving to a beta later means changing sign-up rules, not the schema.
- Needs a way to add an invitee. Keep it manual at first.
- Re-check provider terms and add the account deletion flow before any beta.
