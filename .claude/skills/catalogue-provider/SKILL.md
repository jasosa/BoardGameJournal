---
name: catalogue-provider
description: Rules and workflow for board-game catalogue providers (BoardGameGeek or others), terms checks, caching, provenance and failure handling. Use when researching, adding or changing a catalogue provider or game search.
---

- All providers implement `BoardGameCatalogueProvider` in `src/server/catalogue-providers/` (`searchGames`, `getGame`). The rest of the app never calls a provider directly.
- Before writing a provider, record in an ADR: access method, auth/registration, rate limits, terms on caching, storing and displaying data and images, required attribution. Link the source pages. If terms are unclear, do not cache images; store the external id and link only.
- Never build a scraper without verified permission.
- Provider responses are parsed with Zod. Unknown or partial data degrades gracefully.
- Every imported record stores `source`, `external_id`, `source_url`, `attribution`, `fetched_at`. Images also store licence/attribution.
- Search: debounce in the UI (~250ms), cache results server-side according to the terms, timeout around 5s.
- Failure: show a calm message and offer "Create manually" with the query prefilled. The app must stay fully usable without the provider.
- Tests: contract tests with recorded fixtures (no live calls in CI), plus timeout and error tests.
- Duplicate identity: same `source` + `external_id` maps to one `games` row. Manual games can later be linked to an external id.
