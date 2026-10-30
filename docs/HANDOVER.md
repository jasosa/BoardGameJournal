# Project Handover: Personal Board-Game Library & Journal

Version: 0.1 · Date: 22 October 2026 · Audience: Claude Cowork
Status: Product definition established; implementation not yet started
Working title: Meeple Journal (placeholder)

> Original handover, kept unchanged as the reference. Living versions of this content are in PRODUCT_SPEC.md, ARCHITECTURE.md and ROADMAP.md.

## 1. Mission

Design and build a visually rich, responsive web application for managing a personal board-game collection and recording detailed personal experiences with games.

The application combines:

- Collection and wishlist management.
- Personal reviews and assessments.
- Play-session logging.
- Campaign tracking and continuity.
- Free-form journaling.
- Personal insights into game preferences.

This is not intended to be a clone of BoardGameGeek (BGG). Its defining characteristic is the quality and depth of the personal experience record, combined with an attractive visual library and exceptionally low-friction information entry.

The application should be useful to its creator first, while its architecture supports a potential multi-user public product later.

## 2. Product vision and principles

**Core promise:** Capture information quickly when needed, explore it beautifully later, and build a lasting record of what you think about the games you play.

1. Personal before social. Personal records and reflections are the primary value proposition.
2. Fast capture, rich detail. Basic operations take seconds; detailed writing remains optional.
3. Visual by default. Game artwork, considered typography, whitespace and strong page composition.
4. One source of truth. Game identity, ownership, play history, campaigns and opinions are distinct but connected.
5. Opinions evolve. Preserve historical assessments instead of overwriting earlier impressions.
6. Campaign continuity. Users must be able to resume a campaign after weeks or months away.
7. Private by default. No personal notes or campaign data become public without explicit user action.
8. Portable data. Users can export their information without depending on the continued existence of the application.
9. Avoid unnecessary complexity. Do not build a comprehensive board-game management platform before validating the core experience.

## 3. Target platform and users

Platform: responsive web application; desktop and mobile browsers, including Android; installable PWA is desirable; native mobile applications are out of scope initially.

Initial deployment: a private, single-user application is the initial delivery target. However, design the data model and security boundaries for multiple users from the beginning.

Primary user needs. The application must let users:

- Track games they own, want to buy, are interested in, or previously owned.
- Record what they liked and disliked about a game.
- Assess mechanics, combat, theme, artwork, component quality, production, replayability, solo mode and other dimensions.
- Keep a history of plays and impressions.
- Track campaigns, scenarios, progress and next-session notes.
- Compare games based on personal preferences rather than community rankings.
- Record purchase considerations and revisit expectations after playing a game.

## 4. Information architecture

Use a compact navigation structure.

- **Home:** Recent activity, active campaigns and quick actions.
- **Library:** Visual collection with search, filters, sorting, custom shelves and alternative gallery, shelf and table views. Suggested collection statuses: Owned, Wishlist, Interested, Previously owned / sold. A game can have a play history regardless of its current ownership status.
- **Game detail:** The central product screen. Each game is a personal dossier containing: cover art and catalogue metadata; edition, publisher, year and game relationships; collection status and acquisition details; overall personal rating; structured assessment dimensions; positive and negative observations; play history; campaigns and playthroughs; journal entries and photographs; historical assessments.
- **Journal:** Chronological, searchable records of thoughts, plays and experiences.
- **Campaigns:** Active and completed playthroughs, progress, scenarios, session history and next-session context.
- **Insights:** Personal rating trends, mechanic preferences, play frequency and game comparisons. Implement after sufficient data exists.
- **Quick Capture:** A globally accessible action for adding a game, logging a play or capturing a thought without navigating through multiple screens.

## 5. UX requirements

Quick Capture is a critical feature. Prioritise the following entry flows:

- **Add a game:** search the catalogue; select the correct title and edition; add it to a collection status; retrieve permitted metadata and cover art; allow enrichment later.
- **Log a play:** select or inherit the current game; default the date to today; make duration, players, score and notes optional; save quickly without requiring a rating.
- **Capture a thought:** write a free-form note; associate it with a game, play session or campaign; optionally classify it as positive, negative or an observation; save immediately and allow later editing.

UX targets (to validate, not existing measurements):

- Logging a play for a known game: median under 15 seconds.
- Saving a thought against a known game: median under 10 seconds.
- Adding a known catalogue game to a list: median under 10 seconds, excluding external search latency.
- Immediate feedback on successful operations.
- Draft recovery after accidental navigation.
- Accessible keyboard navigation and visible focus.
- Mobile layouts optimised for one-handed use.

Use optimistic updates where appropriate, local draft recovery, cached search results and responsive images. Do not implement full offline synchronisation in the MVP unless research establishes a compelling need.

## 6. Visual direction

The intended aesthetic is a premium digital collection catalogue combined with an editorial gaming journal.

- Warm neutral light theme: off-white, cream, charcoal and restrained bronze accents.
- Optional dark theme.
- Prominent game cover artwork.
- Consistent image ratios and sensible fallbacks.
- Expressive display typography paired with readable sans-serif interface text.
- Generous whitespace and restrained metadata.
- Subtle, purposeful transitions.
- Minimal visual clutter.

Avoid generic dashboard aesthetics, excessive badges, bright primary colours, dense statistics and gratuitous animation. Create reusable design tokens for colour, typography, spacing, borders, elevation and motion. Do not implement the entire application as a generic component-library demo. The visual identity is an important product requirement.

## 7. MVP scope

**P0, first usable release:** 1. Authentication and private workspace. 2. Game catalogue search and manual game creation. 3. Collection status management. 4. Cover art, game metadata, search and filters. 5. Gallery, shelf and basic table views. 6. Game-detail page. 7. Overall rating and optional dimension ratings. 8. Free-form notes and dated assessments. 9. Play-session logging and history. 10. Quick Capture. 11. Draft persistence and editing. 12. Basic import/export. 13. Multi-user data isolation, even if only one user initially. 14. Responsive desktop/mobile experience.

**P1, following release:** campaign tracking and multiple playthroughs; scenario history and campaign progress; next-session notes; expansion relationships; personal tags and custom shelves; richer mechanics taxonomy; photos and attachments.

**P2, later:** personal gaming insights; game comparisons based on individual criteria; public profiles and shareable collections; optional public reviews; social discovery and recommendations; subscription or commercial features, if justified.

**Explicitly out of scope:** recreating all BGG features; social feed, comments, followers or messaging; complex token-by-token inventory; AI-generated reviews; native iOS and Android applications; microservices or sophisticated distributed infrastructure.

## 8. Technical architecture

Recommended stack: Next.js, React and TypeScript; Tailwind CSS with a selectively customised component foundation, such as shadcn/ui; Supabase and PostgreSQL; Supabase Auth or equivalent; object storage for permitted cover images, user photos and attachments; Zod and typed form handling; Vitest and Playwright; managed Next.js hosting and managed PostgreSQL/Supabase.

Use a modular monolith. Do not introduce microservices, a separate search cluster or event-streaming infrastructure without demonstrated need.

Suggested code organisation:

```
src/
  app/
  components/  library/ game/ capture/ journal/ campaign/
  features/    catalogue/ collection/ plays/ campaigns/ assessments/ attachments/ identity/
  server/      catalogue-providers/ authorization/ validation/ services/
  lib/         database/ schemas/ design-system/
  tests/
```

Keep domain logic independent of presentation. The same validated operation should create a play whether invoked from Quick Capture, a game page or a campaign screen.

## 9. Data model

Use a relational PostgreSQL schema. Catalogue identity and personal records must be separate.

Core entities: `users`, `games`, `game_editions`, `game_images`, `collection_entries`, `play_sessions`, `play_participants`, `campaigns`, `campaign_sessions`, `journal_entries`, `assessments`, `assessment_scores`, `mechanics`, `game_mechanics`, `personal_tags`, `game_tags`. Add an attachment entity when photos and files can be associated with multiple record types.

Essential modelling rules:

1. A game is not the same as an edition.
2. An edition is not necessarily the same as an individual physical copy.
3. A game can have multiple collection entries across users.
4. Selling a game must not delete its play history or personal reviews.
5. A game can have multiple campaigns and playthroughs.
6. Casual plays must not require a campaign.
7. Assessments are dated historical records.
8. Current ratings can be derived from the latest assessment.
9. Mechanics are distinct from personal tags.
10. Expansions should be represented as relationships between games.
11. Use typed fields for important campaign concepts and JSONB only for genuinely variable game-specific state.
12. Support manual catalogue records when external metadata is unavailable.

Data security: UUID identifiers and database migrations; enforce user ownership through PostgreSQL row-level security; authorise operations on the server, not only in the UI; never expose privileged database credentials to the client; make private/public visibility explicit; ensure public catalogue records cannot expose private notes or campaign data; implement export, deletion and tested backup restoration; preserve source and attribution metadata for imported catalogue content and images.

## 10. Catalogue integration

Evaluate BoardGameGeek as a possible metadata provider, but do not assume API access, caching or redistribution rights. Implement a provider abstraction:

```ts
interface BoardGameCatalogueProvider {
  searchGames(query: string): Promise<CatalogueSearchResult[]>;
  getGame(externalId: string): Promise<CatalogueGame | null>;
}
```

Requirements: allow selection of the correct title and edition; store permitted external identifiers and metadata; cache results according to provider terms; handle provider failures gracefully; support manual game creation; track metadata provenance and image attribution; avoid building a scraper without first verifying applicable terms. The application must remain usable when the external catalogue is unavailable.

## 11. Performance and reliability

Optimistic updates for safe operations; immediate save confirmation; recoverable errors; local draft persistence; cached and debounced catalogue search; responsive images and lazy loading; database indexes for common queries; pagination or virtualisation when collection size warrants it; accessible loading and empty states. Test the application with a realistic collection, not only a handful of sample games.

## 12. Testing requirements

- Domain tests: collection status transitions; rating validation and history; campaign progression; duplicate catalogue identities; import/export correctness.
- Integration tests: database constraints and migrations; RLS isolation between two users; linking campaign sessions to play sessions; attachment permissions; catalogue-provider failure handling.
- End-to-end tests: add a game and update its status; find a game through filters; log and edit a play; save and restore a draft; create and resume a campaign; export personal data; verify that one user cannot access another user's private records.

The most important risks to address are capture friction, catalogue dependency and private-data isolation.

## 13. Implementation roadmap

- **Phase 0, Foundation (3-5 days):** finalise requirements and key UX decisions; low-fidelity screen designs; validate catalogue provider access and terms; set up repository, CI, database migrations and environments; define the schema and security model. Exit: the core data model, design direction and first end-to-end slice are validated.
- **Phase 1, Library MVP (1-2 weeks):** authentication and workspace; catalogue search and manual creation; collection management; gallery, shelf and table views; game-detail page; basic ratings and notes; export foundation. Exit: the entire collection can be represented and maintained in the application.
- **Phase 2, Journal (1-2 weeks):** play logging; Quick Capture; journal timeline; structured assessments; draft recovery; editing and deletion. Exit: logging plays and thoughts is fast enough for regular use.
- **Phase 3, Campaigns (1-2 weeks):** campaign and playthrough records; scenario history and progress; next-session notes; expansion relationships; attachments and richer tags. Exit: a campaign can be resumed using saved context without reconstructing its history manually.
- **Phase 4, Insights and hardening (1-3 weeks):** personal preference insights; comparisons and rating trends; accessibility and performance refinement; security review; backup restoration tests; assessment of public sharing requirements. Exit: the core product is reliable, useful and differentiated beyond basic storage.

These estimates assume one developer using AI coding assistance.

## 14. Definition of done

For each feature: the data model and validation are implemented; authorisation and data ownership are verified; loading, empty, error and success states exist; the layout works on desktop and mobile; keyboard navigation and accessible labels are considered; important domain rules have automated tests; changes have been checked against existing functionality; no sensitive data or privileged credentials are exposed; relevant data migration and recovery implications are documented. Maintain a running record of completed work, unresolved decisions, technical debt and next steps.

## 15. Instructions for Claude

Act as a product-minded engineering partner, not simply a code generator. Inspect files before assuming; convert this handover into a backlog; identify unresolved decisions that affect architecture or data integrity; make reasonable, reversible defaults for minor decisions and document them; build one complete vertical slice at a time; run tests after each significant change; keep the visual experience aligned with the principles; avoid out-of-scope features; maintain a project status document; report actual completion and test results.

Initial tasks: 1. Inspect the workspace. 2. Create `docs/PRODUCT_SPEC.md`. 3. Create `docs/ARCHITECTURE.md`. 4. Create `docs/ROADMAP.md`. 5. Validate catalogue provider options and data-use constraints. 6. Wireframes for Home, Library, Game Detail and Quick Capture. 7. Propose initial migrations and security policies. 8. Implement the smallest vertical slice: add a game, store it in the user's collection, display it in the visual library. 9. Test the slice on desktop and mobile before expanding scope.

Do not generate the entire application in one large step.

## 16. Outstanding decisions

- Whether BGG is the preferred catalogue provider or a provider-agnostic approach is required from day one.
- Whether the initial rating system uses an overall rating plus optional dimensions, or another model.
- Whether Markdown-style editing is sufficient initially.
- Whether local draft recovery meets the offline requirement.
- Whether the initial deployment remains private until the product is mature enough for a multi-user beta.

These decisions should be documented in an ADR when resolved.

**Guiding principle:** Build a personal gaming journal that happens to manage a collection, rather than a collection manager that happens to support notes.
