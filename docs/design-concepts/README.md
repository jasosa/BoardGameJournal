# Design concepts (3 directions)

Concept screens for three possible visual directions for Meeple Journal. They are static HTML
with a shared fictional library (`shared/data.js`), generated stand-in box art
(`shared/art.js`) and web fonts from Google Fonts (needs internet). Nothing here is wired to
the app. Plays and notes are future features (L6, L7, Phase 2) and are shown only to
see where they would live.

Open any file in a browser. Screenshots (1440x900) are in `screens/`.

| Concept | Library | Game page |
| --- | --- | --- |
| A. Rulebook (print) | `a-rulebook/library.html` | `a-rulebook/game.html` |
| B. Night Wall (cover-led) | `b-night-wall/library.html` | `b-night-wall/game.html` |
| C. Logbook (journal-first) | `c-logbook/library.html` (the log, as Home) | `c-logbook/game.html` |

## Direction cards

**A. Rulebook.** North star: the Library reads like the index of a well-printed rulebook.
Engine: print grammar (hairline rules, numbered entries, mono facts, one spot colour).
Skeleton: ruled index with a letter gutter, small cover thumbs. Type: Instrument Serif,
Geist Mono, Inter. Colour: paper `#F7F5F0`, ink `#17171A`, spot vermilion `#C8402A`, rule
`#D9D5CB`. Controls: square corners, hairline borders, selection as underline or ink fill.
Memorable moment: the new status is overprinted in vermilion. Gives up: large covers, bronze.

**B. Night Wall.** North star: covers are lit art on a dark wall; the interface is the small
museum label. Engine: a gallery after dark, colour taken from the objects (each game page
tints itself with its cover colour). Skeleton: full-width wall of covers at their real
ratios under a thin floating bar. Type: Schibsted Grotesk, Inter. Colour: base `#121316`,
text `#ECE8DF`, accent only from the cover. Controls: ghost buttons, selection as a thin
cover-colour line. Memorable moment: the cover expands into the game page hero. Gives up: the
light theme and the display serif. Needs a dominant-colour step on cover upload.

**C. Logbook.** North star: the app opens on what you played and thought; the collection sits
behind it. Engine: a field notebook (dated lines, covers as small stamps). Skeleton: one
reading column with a date gutter; the latest note is the hero. Type: Literata,
JetBrains Mono. Colour: paper `#F1F3EE`, ink `#1E2B26`, rule `#C9D0C6`, highlighter
`#F2D14B` (one marker stroke per screen). Controls: square inputs, baseline underline
selection, mono stamps. Memorable moment: logging a play sweeps a highlighter over the title.
Gives up: the cover wall as the front page. Depends on plays and notes existing.

## Not verified

Benchmarks were not looked at (written from memory). Fonts are not checked for licence or
loading cost. Only desktop (1440x900) first screens exist; no mobile, no dark or light
counterpart, no interaction.

## Concept B in the app

B was built on the `concept-b` branch (ADR-0010). One deliberate difference: input and button borders use a stronger edge (3:1 contrast) than the concept's faint hairline. The search placeholder has no game count.
