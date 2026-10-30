---
name: adr
description: Record an architecture or product decision as an ADR in docs/adr. Use when a decision affects architecture, data integrity, security, external providers or scope, or when resolving an open question from STATUS.md.
---

1. Next number: look in `docs/adr/` and take the highest + 1 (4 digits).
2. Copy `docs/adr/0000-template.md` to `docs/adr/NNNN-short-title.md`.
3. Fill: context, options considered (at least two), decision, consequences, status (Proposed / Accepted / Superseded by NNNN).
4. Only mark Accepted when the user agreed.
5. Link it from `docs/STATUS.md` (Decisions section) and remove the matching open question.
6. If it supersedes an older ADR, update the old one's status line.
Keep it under one page. Plain language.
