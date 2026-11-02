# ADR-0008: Email and password sign-in, accounts created by script

- Status: Accepted
- Date: 2026-11-02

## Context

ADR-0006 chose a private app with public sign-up off and left the allowlist mechanism open. The first slice (F0.10) needs sign-in. The app is for one user first and must be able to become multi-user.

## Options

1. Email + password, accounts created by a server-only script. No allowlist table.
2. Magic link by email. Needs reliable email delivery. Supabase's default sender is very limited, so it needs an SMTP service soon.
3. Password login plus an allowlist table checked at sign-up. Keeps a sign-up path open that must stay locked.

## Decision

Option 1.

- Supabase Auth email provider on, public sign-up off (`[auth] enable_signup = false`).
- Accounts are created with `npm run user:create -- <email>`. The script uses the admin API with the service role key, generates a password and prints it once. It is a standalone Node script, not imported by the app.
- The set of existing accounts is the allowlist. Nobody can create an account from the app.
- Server code gets the user with `supabase.auth.getUser()` (validated with the auth server). The request proxy only does optimistic redirects.
- No `next` redirect parameter on login, so there is no open-redirect surface.

## Consequences

- Adding a user is a manual step by the owner. Fine for one user and a small beta.
- No password reset or change yet. Record in STATUS.md. Before a beta: add password change in Settings and a reset flow (needs email delivery).
- The hosted Supabase project must have "Allow new users to sign up" off and the email provider on.
- Moving to open or invite-based sign-up later means changing auth settings and adding UI, not the schema.
