# ADR-0003: Catalogue provider

- Status: Accepted (user: start without BGG)
- Date: 2026-10-30

## Context

We need game metadata (title, year, players, cover) without building a BGG clone. The app must work when the provider is down. Terms decide what we may cache and show.

BGG's pages returned HTTP 403 to our fetch tool on 2026-10-30. The user pasted the full text of both pages, so both are verified.

Sources:
- https://boardgamegeek.com/using_the_xml_api (version date 2025-07-02)
- https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use (read 2026-10-30, no version date shown)

From "Using the XML API":
- Registration is required for nearly all use. Apply at boardgamegeek.com/applications. A reply may take a week or more.
- A registered app gets a Bearer token. Send `Authorization: Bearer <token>` to `boardgamegeek.com` (no `www`).
- Non-commercial licences are generally free. Commercial means any money, ads or paid benefit. Voluntary donations still count as commercial.
- BGG may deny apps that compete with its business.
- Usage limits are "still being determined". Make requests from our server, cache results, keep requests to a minimum. Client-side calls can get the licence suspended.
- Third-party services that give other apps access to BGG data are prohibited.
- Downloading your own collection while logged in needs no registration. The CSV dump of all games needs an approved app.
- Policies can change at any time.

From the Terms of Use:
- Licence to "reproduce and display" the API data, including user submissions, solely for strictly non-commercial purposes. BGG can end it at any time.
- No use of the API or any site data to train AI or LLM systems.
- No modifying the retrieved data in any way.
- Credit BoardGameGeek by name as the source in all uses. Show the "Powered by BGG" logo, linked to BGG, in public-facing uses.
- Not stated: explicit rules on storing or caching data, and on image files. The only guidance is BGG's advice to cache server-side. Images are not mentioned.

Other providers: Board Game Atlas shut down in 2023, so it is not an option. No open, maintained board-game dataset was found (Wikidata licence and coverage not checked).

## Options

1. BGG XML API2 as the main provider. Best coverage. Needs approval, token, attribution. A multi-user beta may breach "non-commercial".
2. Manual entry only. No dependency, no terms risk. Slow data entry, no covers.
3. Interface from day one, ManualProvider first, BGG added behind the interface once the token is granted.
4. BGG collection CSV import by the user (their own export). Same terms apply to the data.

## Decision

Option 3, starting with manual only. The user chose to start without BGG.

- Build `BoardGameCatalogueProvider` and `ManualProvider` first (L2). `ManualProvider` is the only provider for now.
- BGG is deferred. Do not register an app or write a BGG provider until the user decides to. The rules below apply when we do.
- Search and add flows still show the failure path and "Create manually" with the query prefilled, so a provider can be added without UI changes.
- For any future external provider: server-side only, token in a server-only env var, 5s timeout, few requests.
- BGG metadata caching: yes. Terms allow reproducing and displaying, and BGG asks us to cache. Treat this as revocable.
- Images: no. Terms are silent and image rights likely sit with publishers and uploaders. Do not copy BGG images to our storage. Keep the external image URL and show it by hotlink, with attribution, as an optional extra. The app must look fine without it.
- No modification: imported BGG rows are stored as received. Keep the raw payload in a `provider_payload jsonb` column beside the normalised fields. Personal edits and notes go in personal tables, never over the imported row.
- Provenance on catalogue rows: `source`, `external_id`, `source_url`, `attribution`, `fetched_at`. Unique (`source`, `external_id`).
- Show "Data from BoardGameGeek" wherever BGG data appears, even while private. Add the "Powered by BGG" logo before any public-facing use.
- No AI features that read BGG data. Do not feed BGG data to models. Recorded test fixtures stay in tests only.
- Users may upload their own cover to private storage for manual games.
- No scraping.

## Consequences

- Schema gets provenance and `provider_payload` columns now. No blocker for F0.4.
- All games are entered by hand, with covers uploaded by the user. Entry must be fast (see PRODUCT_SPEC 5.1).
- Adding BGG later is a new provider plus a registration, not a redesign.
- Stay private and free (Q5) to remain non-commercial. Revisit before any beta: payments or ads make it commercial, and public-facing needs the logo.
- BGG can end the licence at any time, so the app must never depend on it.
- A user collection CSV import can come later without a token. It follows the same no-modify, credit and no-AI rules.
- Review when BGG changes its terms. The image decision is a cautious reading of silence, not a ruling.
