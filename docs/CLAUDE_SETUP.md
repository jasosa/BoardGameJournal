# Claude setup for this project

How to work on Meeple Journal with Claude Code (main coding tool) and Cowork (planning, research, design reviews).

## 1. One-time install on Windows

1. **Git for Windows** (Claude Code uses Git Bash for shell commands): https://git-scm.com/download/win
2. **Node.js 24 LTS** (22 also works): https://nodejs.org (check: `node -v`).
3. **Claude Code** (PowerShell): `irm https://claude.ai/install.ps1 | iex`
   Then `claude` in a terminal and sign in with your Claude account. Check: `claude doctor`.
   Docs: https://code.claude.com/docs/en/setup
4. **Docker Desktop** (for local Supabase): https://www.docker.com/products/docker-desktop
5. Optional: **GitHub CLI** `winget install GitHub.cli` then `gh auth login`.
6. Optional: VS Code with the Claude Code extension, if you like an editor next to the terminal.

## 2. Start a session

```powershell
cd C:\Users\Juanan\code\BoardGamesApp
claude
```

The first time, Claude Code asks you to trust the folder and approve the project MCP servers in `.mcp.json` (Playwright, Context7). Approve them.

At start a hook loads the "Now / Next" part of `docs/STATUS.md`. A good first prompt:

> Read CLAUDE.md and docs/STATUS.md. Let's do the next item. Plan first.

## 3. What is in the harness

| Piece | File | What it does |
|---|---|---|
| Project memory | `CLAUDE.md` | Rules, stack, layout, security, workflow. Always loaded. |
| Permissions | `.claude/settings.json` | Auto-allow dev/test/git-read commands. Ask for installs, push, remote DB. Deny reading `.env`, force push. |
| Hook: file guard | `.claude/hooks/guard-files.mjs` | Blocks writing `.env*`, service role key in `src/app` or `src/components`, editing committed migrations. |
| Hook: bash guard | `.claude/hooks/guard-bash.mjs` | Blocks printing env files, `printenv`, force push, remote DB reset, DROP DATABASE/SCHEMA. |
| Hook: format | `.claude/hooks/format-file.mjs` | Runs Prettier on edited files (once Prettier is installed). |
| Hook: session context | `.claude/hooks/session-context.mjs` | Injects STATUS.md "Now/Next" and git status at start. |
| Agent | `db-security-reviewer` | Reviews migrations, RLS, server actions. Read-only. |
| Agent | `design-reviewer` | Screenshots desktop + mobile with Playwright, checks visual identity and a11y. |
| Agent | `dod-verifier` | Runs all checks and gives DONE / NOT DONE against the Definition of done. |
| Skill | `/vertical-slice` | Step-by-step for one feature slice. |
| Skill | `/db-migration` | Migration + RLS template + isolation test. |
| Skill | `/design-system` | Tokens and visual rules. |
| Skill | `/catalogue-provider` | Provider rules, terms, caching, fallback. |
| Skill | `/adr` | Write a decision record. |
| Skill | `/wrap-up` | Update STATUS.md, tick ROADMAP, commit. |
| MCP | Playwright | Claude opens the app in a browser, resizes, screenshots. |
| MCP | Context7 | Current docs for Next.js, Supabase, Tailwind, etc. |

Skills load by themselves when relevant, or call them with `/name`. Agents run when Claude decides or when you ask ("run the db-security-reviewer").

## 4. Daily loop

1. `claude` → "Next item from STATUS.md, plan first." Use **plan mode** (Shift+Tab) for anything bigger than a small fix.
2. Review the plan. Push back on scope.
3. Let it build the slice. It runs tests itself.
4. Ask for reviewers when relevant, then `dod-verifier`.
5. `/wrap-up` at the end. It updates STATUS.md and commits.
6. `/clear` between unrelated tasks to keep context clean.

## 5. Later additions

- **Supabase MCP** (after you create the Supabase cloud project). Read-only, scoped to one project:
  `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<your-ref>&read_only=true"`
  Never give it write access to production. Docs: https://github.com/supabase/mcp
- **GitHub**: create the remote repo and push (`gh repo create meeple-journal --private --source . --push`). Then CI from ROADMAP F0.8.
- **Commands in CLAUDE.md**: after scaffold (F0.6), replace the placeholder command list with the real scripts.
- **Personal preferences** that are not project rules go in `CLAUDE.local.md` (git-ignored) or `~/.claude/CLAUDE.md`.

## 6. Notes

- `.mcp.json` uses `cmd /c npx` for Playwright because Claude Code on native Windows needs it. On macOS/Linux/WSL change it to plain `npx`.
- Hooks are written in Node so they work on Windows and Unix. They are safety rails, not the security model. RLS and reviews are.
- Cowork (this project in the Claude app) is good for research (catalogue terms), wireframes and reviewing docs. It works on the same folder.
