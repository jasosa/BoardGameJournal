# Meeple Journal (working title)

A personal board-game library and journal. Capture quickly, explore beautifully, keep a lasting record of what you think about the games you play.

Status: Phase 0, foundation. See [docs/STATUS.md](docs/STATUS.md).

- Product: [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)
- Working with Claude: [docs/CLAUDE_SETUP.md](docs/CLAUDE_SETUP.md)

## Run it locally

1. Node 24 (`.nvmrc`), Docker Desktop, then `npm install`.
2. `npx supabase start` (the first run downloads images).
3. Copy the example env file to `.env.local`. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the output of `npx supabase status`. For `npm run user:create` also set `SUPABASE_SERVICE_ROLE_KEY`. Never commit `.env.local`.
4. `npm run user:create -- you@example.com` prints a password once. Public sign-up is off, so this is the only way to get an account.
5. `npm run dev`, open http://localhost:3000 and sign in.
