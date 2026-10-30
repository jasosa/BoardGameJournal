---
name: wrap-up
description: End-of-session routine. Updates docs/STATUS.md with what was done, verified test results, decisions, tech debt and next steps, then commits. Use when the user says wrap up, end of session, or a slice is finished.
---

1. Collect facts: `git status`, `git diff --stat`, and the latest real test results (run them if not run since the last change).
2. Update `docs/STATUS.md`:
   - **Now**: current phase and the slice in progress.
   - **Next**: the next 3 concrete steps.
   - **Done**: add a dated line per finished item with how it was verified (tests, screenshots). Only things that were actually verified.
   - **Open questions** and **Decisions** (link ADRs).
   - **Tech debt** and **Migration notes** if any.
3. Tick finished items in `docs/ROADMAP.md`.
4. Commit with a clear message (`feat:`, `fix:`, `docs:`, `chore:`). Do not push unless asked.
5. Tell the user in 3-5 lines: what is done, what was verified, what is next, anything that needs their decision.
