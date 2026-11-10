# L8 Export foundation: UX concept

Status: **approved by the user on 2026-11-10 (Option A, all 14 default answers). Built in L8, see ADR-0014 and docs/STATUS.md.** Drawings are in `index.html` in this folder. Open it in a browser; it needs internet for the Google Fonts. Each state has an anchor, for example `index.html#st-a10`.

## 1. Understanding

On the Settings page, the owner downloads everything they have recorded as one JSON file. That covers their games and facts, every copy (archived ones too), status history, ratings and thoughts. They can later put that same file back into an empty account. ROADMAP L8 asks for a full JSON export, and its acceptance test is "export, then import into an empty account, round-trips". PRODUCT_SPEC puts "export/import" in Settings and lists "portable data (export everything)" as a principle.

Assumptions:

- One account, one person. Import is for moving or restoring: a new account, or the same data on another deployment. It is not for merging two libraries.
- Import works only into an **empty account**: no copies (archived ones included), no ratings, no thoughts, and no games you created. Status history cannot exist without copies.
- Cover image files are not in the file (see Q1). The file keeps a reference to each cover (path, size, colours), so a later "covers too" export can match files to games. Imported games arrive without covers and show their initial tile.
- Thought drafts live only on the device (ADR-0005), so they are not exported.
- No screen writes `profiles`, `game_editions` or the extra copy columns yet (`acquired_on`, `sold_on`, `price`, `currency`, `source`, `notes`). The copy columns are exported as they are (null today). Profiles and editions are left out (Q8).
- Every game today is a private manual game. Catalogue games from a provider (L2) do not exist yet.
- Import is all or nothing. A failure never leaves half a library.
- The Settings page today has a "Settings" title and an "Account" section with "Sign out". Nothing in it changes except a new section below it.

## 2. Options

All three use the same export file, the same checks and the same copy. They differ in where the feature lives and how much room the import check gets.

### Option A: Inline section in Settings (recommended)

- A "Your data" section under Account, at most 42rem wide, with two blocks.
- **Export**: one sentence, one line of counts ("214 games · 231 copies (9 archived) · 412 status changes · 37 ratings · 52 thoughts"), a "What is in the file" disclosure (`details`) and one primary button, "Download export". Feedback is a line under the button.
- **Import**: one sentence about the empty-account rule. In an account with data, one more sentence says import is not available here, and there is no file control. In an empty account, a quiet bordered "Choose a file" button. The file is checked on the device. Then a raised panel opens in place with the file name, size and date, what is in it, a cover note, and "Cancel" and "Import".
- Trade-off: the import check gets only a text column, so a long problem list makes the page long. The panel is inline, so the empty-account rule is the guard against a wrong import, not a separate dialog. No new route, no dialog component, nothing in the nav changes.

### Option B: Its own page with steps

- Settings shows one row, "Export and import", with a count line and a chevron. It opens `/settings/data` ("← Settings", title "Your data").
- Desktop: Export on the left (counts as a list, Included and Not included lists open, "Download export") and Import on the right as three numbered steps: "1 · Choose a file", "2 · Check what is in it" (counts, plus the first five titles as the initial tiles they will become), "3 · Import" ("Import 214 games" and "Cancel"). Phone: the two columns stack.
- Trade-off: more room, and the steps explain the flow. But it adds a route and a tap. The step list reads like a wizard, which is heavier than the rest of the app. The Export column spends a whole page on what one line can say.

### Option C: Export inline, import in a dialog

- Export as in Option A. Import is one quiet button, "Import from a file", shown only in an empty account. It opens the file picker. The check, Import, progress and result then show in a dialog on desktop and a full-height sheet on a phone.
- Trade-off: the import is set apart from the page, with a focus trap and a clear end. But it needs a dialog primitive (shadcn is not set up yet, see Tech debt), a long problem list scrolls inside a box, and on a phone the sheet hides the page for a task that happens once or twice in the life of an account.

## 3. States drawn for Option A

All at 1280 (the Your data section, cropped) and 390, in `index.html` under "Option A: every state":

A1 default, account has data · A2 "What is in the file" open (A1 is closed) · A3 loading · A4 could not load · A5 export preparing (pending) · A6 download started (success) · A7 export failed · A8 empty account · A9 checking the file · A10 ready to import (panel open; A8 is closed) · A11 not an export · A12 file has problems · A13 newer format · A14 file too large · A15 file with no games · A16 importing (pending) · A17 import failed · A17b server check refused the file · A18 account no longer empty · A19 import complete · A20 many items, large library (export counts) · A20b many items, large file ready to import · A21 long file name · A21b long titles in the problem list.

There is no menu or popover in Option A. The disclosure (A1 closed, A2 open) and the import panel (A8 closed, A10 open) are the open and closed pairs.

## 4. Behaviour notes (Option A)

### Placement

- Settings page order: "Settings" title, "Account" (Sign out, unchanged), then "Your data". Headings: `h1` Settings, `h2` Your data, `h3` Export and Import, `h4` inside the panel.
- The Your data section streams in its own Suspense boundary, because it needs counts. Sign out never waits for it.

### Export

- The counts line lists games, copies (with "(n archived)" only when n is more than 0), status changes, ratings and thoughts. An item with 0 is left out. Singular forms: "1 game", "1 copy", "1 status change", "1 rating", "1 thought". Numbers use the en-GB thousands separator ("1,204").
- "Games" counts the games the file will hold: games you created, plus any game you have a copy, rating or thought on. Today these are the same.
- "What is in the file" is a native `details`. It is closed on every visit. Open, it shows:
  - "Included": "The games you added, with their facts: year, players, play time, description" · "Every copy, archived ones too, with its status history" · "Every rating, with its date" · "Every thought, with its topics and date".
  - "Not included": "Cover images. The file notes which games had one." · "Thought drafts you never saved. They stay on this device."
- "Download export" (primary). On click, the label becomes "Preparing your file". The button gets `aria-disabled="true"` (not `disabled`, so it keeps focus) and ignores clicks. The server builds the file for the signed-in person only. The browser then saves it as `meeple-journal-YYYY-MM-DD.json` (the person's local date).
- Success: the button comes back. Under it, the line "Download started: {file name}, {size}." shows (for example "Download started: meeple-journal-2026-11-10.json, 1.1 MB."). It sits in a polite live region and stays until the page is left or the button is pressed again. Focus stays on the button.
- Size format: base 1024. "84 KB" under 1 MB (whole numbers), "1.1 MB" from 1 MB (one decimal).
- Failure (offline, server error, session ended): "Could not prepare your export. Nothing was downloaded. Try again." in `negative` with `role="alert"`, under the button. The button comes back with focus.
- Empty account (nothing in any table above): the counts, the disclosure and the button are not shown. Instead: "Nothing to export yet. Once you add a game, a rating or a thought, you can download it here."
- Nothing is saved on the server by an export. There is no "last exported" date (Q9).

### Import: availability

- Under the "Import" heading, always: "Put an export back into this account. Import works only into an empty account, so it never mixes with or overwrites what you have."
- Account with data: then "This account already has games, ratings or thoughts, so import is not available here. To put a file back, use a new, empty account." No file control.
- Empty account: a quiet bordered button "Choose a file" (a real `<input type="file" accept=".json,application/json">`, see the contract) and the hint "A .json file made by Export, up to 10 MB."

### Import: checking the file (on the device)

Choosing a file starts the check at once. Closing the picker without a file changes nothing. The steps, in order:

1. Size over 10 MB: refused before reading (A14).
2. Read the text. While it reads and checks, "Checking {file name}" shows under the hint. "Choose a file" is aria-disabled. A polite announcement says "Checking your file".
3. Not JSON, or no `"format": "meeple-journal-export"`: "not an export" (A11).
4. `version` is a whole number above 1: "newer format" (A13). Any other value that is not 1: "not an export".
5. The shared Zod schema checks the content: "problems" (A12).
6. No games: "no games" (A15).
7. Otherwise: the panel (A10).

After any result, the button reads "Choose another file". Choosing again replaces the result and runs the check again.

Messages (exact copy; `{file}` is the file name, `{n}` a count):

- A11: "“{file}” is not a Meeple Journal export. Choose the .json file that Export downloaded."
- A14: "“{file}” is {size}, and the limit is 10 MB. Choose the .json file that Export downloaded."
- A13: "“{file}” was made by a newer version of Meeple Journal (format {version}). This version reads format 1 only."
- A15: "“{file}” has no games in it, so there is nothing to import."
- A12: "“{file}” has {n} problems, so nothing can be imported:" ("1 problem" in the singular), then a list of the first five problems in file order. Then "and {n} more." when there are more, and the hint "If the file was edited by hand, fix these and choose it again."

Problem lines name the place first, then the problem. The game is named by its title in curly quotes, or "Game {position}" when the title is missing. The parts of a game are "copy {position}", "rating from {date}" and "thought from {date}", with dates as on the game page ("2 March 2026"). The templates:

- "Game {n}: the title is missing." · "Game “{title}”: the title is longer than 200 characters."
- "Game “{title}”: the year is outside 1 to 2200." · "Game “{title}”: the player counts are not valid." · "Game “{title}”: the play time is not valid." · "Game “{title}”: the description is longer than 2,000 characters." · "Game “{title}”: kind “{value}” is not one of base, expansion, standalone expansion."
- "Game “{title}”, copy {n}: status “{value}” is not one of owned, wishlist, interested, previously owned." · "Game “{title}”, copy {n}: it has no status history." · "Game “{title}”, copy {n}: its history does not end in its status ({status})." · "Game “{title}”, copy {n}: a status change date is outside 1900 to today."
- "Game “{title}”, rating from {date}: rating {value} is outside 0 to 10." · "Game “{title}”, rating from {date}: ratings have at most one decimal." · "Game “{title}”, rating from {date}: the date is outside 1900 to today."
- "Game “{title}”, thought from {date}: the text is empty." · "Game “{title}”, thought from {date}: the text is longer than 10,000 characters." · "Game “{title}”, thought from {date}: topic “{value}” is not one of the nine topics." · "Game “{title}”, thought from {date}: topic “{value}” is listed twice." · "Game “{title}”, thought from {date}: the date is outside 1900 to today."
- Fallback for anything else the schema refuses: "Game “{title}”: {field path} is not valid." (or "The file: {field path} is not valid." outside a game).

The date rules match the database (1900-01-01 to tomorrow, one day of time zone slack). The copy says "today" because that is what a person means.

### Import: the panel (A10)

- Raised surface, radius 4, padding 16 (12 on a phone, bleeding 8px into the side padding), `role="region"`, labelled by its heading.
- Heading "Ready to import" (`h4`, `tabindex="-1"`). Focus moves here when the panel opens.
- The file name (ink, breaks anywhere), then on the next line "{size} · exported {date}". The date is `exported_at` as a local date.
- A two-column list: Games {n} · Copies "{n}, {a} of them archived" (or "{n}" when none is archived) · Status changes {n} · Ratings {n} · Thoughts {n}. All five rows always show, 0 included.
- When some games had a cover: "Covers are not in the file. {n} of these games had a cover; they arrive with their initial, and you can add the cover again on the game page." For 1: "1 of these games had a cover; it arrives with its initial, and you can add the cover again on the game page." When none had one: no note.
- Footer, right-aligned: "Cancel" (quiet bordered) and "Import" (primary).
- Cancel: the panel closes, the file is forgotten, the button reads "Choose a file" again, and focus goes to it. No message.
- Nothing is saved until Import.

### Import: saving

- Import sends the file to the server. The server takes the user from the session and runs the same Zod check again. Then, in one transaction, it checks that the account is still empty and writes everything (see Data needs).
- Pending (A16): "Import" reads "Importing", aria-disabled, and keeps focus. "Cancel" and "Choose another file" are aria-disabled. Above the footer: "Importing {n} games with their history, ratings and thoughts. This can take a minute. Keep this page open." (1 game: "Importing 1 game with its history, ratings and thoughts. ..."). While pending, leaving or reloading the page triggers the browser's own "Leave site?" question (`beforeunload`). If the person leaves anyway, the server finishes or rolls back on its own. The next visit shows the result: A1 if it was saved, A8 if not.
- Success (A19): the panel becomes the result. Heading "Import complete" (`tabindex="-1"`, focused, inside `role="status"`). Then "This account now has {games} games, {copies} copies, {changes} status changes, {ratings} ratings and {thoughts} thoughts." (counts returned by the server). Then, when covers were referenced, "{n} of these games had a cover. Add their covers again on each game page." Then "Open your Library" (a link styled as a quiet bordered button, to `/library`). "Choose another file" and the lead sentence are gone. The Export block shows the new counts and "Download export" (the page data is revalidated). On the next visit, Import shows the A1 sentence.
- Failure, network or server (A17): alert in the panel above the footer: "The import did not finish, and nothing was saved. Your file is fine. Try again." Buttons come back. Focus stays on Import.
- Server check refused the file (A17b): "The file did not pass the check on the server, so nothing was saved. Choose the file again, or export it again." Buttons come back. Focus stays on Import.
- Account no longer empty (A18): "Something was added to this account after you chose the file, so nothing was imported. Import works only into an empty account." The Import button is removed, "Choose another file" stays aria-disabled, and focus goes to Cancel. Cancel then shows the A1 state, with focus on the "Import" heading (`tabindex="-1"`).
- Partial failure cannot happen: one transaction, all or nothing.
- Not undoable. The account was empty before, and there is no "clear my account" (out of scope, see Q11).

### Loading and errors of the section

- Loading (A3): the "Your data" heading, then "Export" with three bars (two lines and a button) and "Import" with two bars. `aria-busy="true"`, visually hidden "Loading a summary of your data". No shimmer.
- Load failure (A4): the heading, then a raised box with `role="alert"`: "Could not read your data just now, so export and import are not available." and a "Try again" link to `/settings`. No buttons.

### Keyboard order and accessible names

- Order: Sign out → "What is in the file" (summary) → "Download export" → "Choose a file" (or "Choose another file") → in the panel: "Cancel" → "Import" → after success: "Open your Library".
- The file input is the focusable element. It is visually hidden but keeps focus, and its styled label shows the 2px accent focus ring when the input has keyboard focus. Accessible name "Choose a file" ("Choose another file" after a result), described by the hint.
- Live regions: one polite region in the Export block ("Download started: ..."), one polite region in the Import block ("Checking your file", "Importing"). Errors use `role="alert"`. The problem list sits inside the alert.
- Focus moves: panel opens → "Ready to import" heading; file error → stays on the file button; Cancel → file button; import success → "Import complete" heading; import failure → stays on Import; account no longer empty → Cancel.
- Every control is at least 44px tall and shows the 2px accent focus ring with an offset. Nothing needs hover. Escape does nothing here (there is no popover).

### Offline and failure

- Export needs the server. Offline, it shows the A7 message.
- The file check runs on the device and works offline. Import itself needs the server. Offline, it shows the A17 message, and nothing is saved.
- No retry queue and no offline sync (ADR-0005 scope).

## 5. Data needs

Reads (all for the signed-in person, RLS on):

- Summary counts: copies, archived copies, status changes, ratings, thoughts, and the number of games the file would hold. "Empty account" means all of these are 0.
- Export: `games` (created by you, or referenced by your copies, ratings and thoughts), `collection_entries` (all columns, `archived_at` included), `collection_status_changes`, `assessments`, `journal_entries`, and `game_images` for the cover reference.

File format, version 1 (JSON, two-space indent, UTF-8), nested per game so it reads well by hand:

```json
{
  "format": "meeple-journal-export",
  "version": 1,
  "exported_at": "2026-11-10T17:42:07Z",
  "games": [
    {
      "id": "…original uuid…",
      "name": "Wingspan",
      "year": 2019, "min_players": 1, "max_players": 5, "play_time_min": 70,
      "description": "…", "kind": "base", "source": "manual",
      "created_at": "…",
      "cover": { "path": "covers/…/cover.webp", "width": 900, "height": 1200,
                 "dominant_color": "#2e6e7e", "accent_color": "#8cc3cf" },
      "copies": [
        { "id": "…", "status": "owned", "archived_at": null,
          "acquired_on": null, "sold_on": null, "price": null, "currency": null,
          "source": null, "notes": null, "created_at": "…",
          "history": [
            { "from_status": null, "to_status": "wishlist", "changed_on": "2026-09-12", "recorded_at": "…" },
            { "from_status": "wishlist", "to_status": "owned", "changed_on": "2026-10-01", "recorded_at": "…" }
          ] }
      ],
      "ratings": [ { "overall": 8.5, "assessed_on": "2026-11-04", "created_at": "…" } ],
      "thoughts": [ { "body": "…", "topics": ["mechanics", "artwork"], "written_on": "2026-11-02",
                      "created_at": "…", "updated_at": "…" } ]
    }
  ]
}
```

- `cover` is `null` when the game has no uploaded cover.
- Ids are in the file for reference only. Import makes new ids, so the same file can go into any empty account without clashes.
- One Zod schema describes this format. It is shared by the export (output check), the device check and the server import.

Writes (import only):

- No new table and no new column.
- One database function, for example `import_account(p_data jsonb)`, called by one service function. It is needed because the Supabase client cannot run several statements in one transaction, and because the import must get past three guards on purpose: the status-history guard trigger (ADR-0009, which already expects "a deliberate import"), the first-history-row trigger, and the triggers that set `created_at` to now on ratings and thoughts. It takes the user from `auth.uid()`, locks per user, refuses unless the account is empty, and inserts games (private, manual, `created_by` = you), copies, history rows, ratings and thoughts. It keeps the original dates and timestamps (`created_at`, `recorded_at`, `archived_at`, `updated_at`), because the History order and the "Added" date depend on them. It returns the counts. ADR-0009 says an import goes "through a service-role path". A security-definer function tied to `auth.uid()` keeps the service role out of a user request. That change needs a new ADR in the plan, and a `db-security-reviewer` run.
- The round-trip test (the AC): export account A → import into empty account B → export B. The two files must be equal except for `id` fields, `exported_at` and `cover` (null in B, because files are not copied).

Out of scope, flagged instead of designed:

- Cover image files in the export, as a ZIP (Q1). Larger than the 11 MB server action limit for a real library, so it needs its own upload path.
- CSV export (ROADMAP J7, Phase 2) (Q2).
- BGG collection import (ARCHITECTURE section 4 mentions it "if terms allow"; ADR-0003 deferred BGG).
- Import into an account with data, merging, or replacing (Q3), and a "clear my account" action (Q11).
- Catalogue (provider) games in the file: none exist before L2. A version 1 file holds only `"source": "manual"` games. When L2 lands, the format needs a decision on linking by `external_id` (probably version 2).
- Plays, campaigns, tags, photos: their tables do not exist yet. Each new personal table must be added to the export when it lands, with a version bump if the shape changes.

## 6. Recommendation and questions

**Recommendation: Option A.** Settings holds only Sign out today, so the data tools fit inline without crowding it. Export is a single tap with its result right under it. The import check is short in the normal case: a five-line list and two buttons. It needs no new route, no dialog component and no change to navigation. The strong rule (empty accounts only, all or nothing) does the protecting, so a separate dialog adds ceremony and no safety. Option B's step list and extra page feel like a wizard, which the app avoids. Option C needs a dialog primitive for a task done once or twice.

Open decisions (my default in brackets):

- Q1. Cover images: JSON only now, with cover references, and a "with covers" ZIP as its own later slice? [Yes. JSON only now. Propose the ZIP for STATUS open questions.]
- Q2. CSV now or later? [Later, with J7 in Phase 2.]
- Q3. Import only into an empty account? [Yes. No merge, no replace.]
- Q4. File identity: `"format": "meeple-journal-export"` plus a whole-number `"version": 1`. This app reads version 1 only, and later versions bring a converter. [Yes.]
- Q5. File size limit for import. [10 MB. It stays under the 11 MB server action limit, and a library of about 1,200 games with 3,000 thoughts is about 9 MB.]
- Q6. Keep the original dates and timestamps on import ("Added", History order, rating and thought times)? [Yes. The round-trip needs it.]
- Q7. Export the copy columns that no screen fills yet (`acquired_on`, `sold_on`, `price`, `currency`, `source`, `notes`), as null? [Yes, so the format does not change when they get a screen.]
- Q8. Leave out `profiles` (display name, preferences) and `game_editions`, which nothing writes yet? [Yes, leave out.]
- Q9. Show a "Last exported on" date? It would need a new column. [No.]
- Q10. Pretty-print the JSON (two spaces), so it is readable and diffable by hand? It makes the file about 20% larger. [Yes.]
- Q11. A "clear my account" action, so a file can go back into the same account? [No, out of scope. Use a new account.]
- Q12. Show at most five problems, then "and n more"? [Five.]
- Q13. The browser's "Leave site?" question while importing? [Yes.]
- Q14. Should the import success or the cover note list which games had covers (titles), not just the count? [No, the count only. Their initial tiles show it in the Library.]

## 7. Implementation contract (Option A)

Placement and structure

1. The Settings page keeps its title and the Account section (Sign out) unchanged. A new `section` "Your data" (`h2`, same style as "Account") sits below Account.
2. The section is at most 42rem wide and holds two blocks in this order: Export, then Import, each with an `h3` (18px Schibsted Grotesk, 600). 36px between the blocks. No borders between them.
3. Only tokens are used. One primary (light-filled) button per block at most: "Download export" in Export, "Import" in the import panel.
4. Nothing else in the app changes: navigation, the Library and the game page stay as they are.

Loading and load error

5. The section loads in its own Suspense boundary. Sign out renders at once.
6. Loading skeleton as in A3: the "Your data" heading, "Export" with two text bars and a 44px button bar, "Import" with two text bars. `aria-busy="true"` and a visually hidden "Loading a summary of your data". No shimmer.
7. Load failure as in A4: a raised box (radius 4, padding 20 by 24) with `role="alert"`: "Could not read your data just now, so export and import are not available." and a "Try again" link to `/settings`. No export or import controls.

Export

8. Lead sentence (`ink-soft`): "Download a copy of everything you have recorded, as one JSON file."
9. Counts line (14px, `ink`, tabular numbers): games, copies with "(n archived)" when n > 0, status changes, ratings, thoughts, joined by a middle dot in `ink-faint`. Each item stays on one line, and the line wraps between items. Items with 0 are left out. Singulars: "1 game", "1 copy", "1 status change", "1 rating", "1 thought". Numbers use the en-GB thousands separator.
10. A native `details` disclosure, summary "What is in the file", 44px tall, 14px `ink-soft`, with a "›" chevron (`aria-hidden`) that turns 90 degrees when open. Closed on every visit.
11. Its content: "Included" with four items: "The games you added, with their facts: year, players, play time, description", "Every copy, archived ones too, with its status history", "Every rating, with its date", "Every thought, with its topics and date". Then "Not included" with two items: "Cover images. The file notes which games had one.", "Thought drafts you never saved. They stay on this device."
12. Primary button "Download export".
13. Pending: the label is "Preparing your file", `aria-disabled="true"`, clicks ignored, focus kept.
14. The file is built on the server for the session user only, with the format in Data needs, and saved by the browser as `meeple-journal-YYYY-MM-DD.json` (local date), content type `application/json`.
15. Success: under the button, in a polite live region, "Download started: {file name}, {size}." (14px, `ink-soft`, file name in `ink`). Focus stays on the button. The line stays until the page is left, and clears when the button is pressed again.
16. Size format: base 1024; under 1 MB whole KB ("84 KB"), from 1 MB one decimal ("1.1 MB").
17. Failure: "Could not prepare your export. Nothing was downloaded. Try again." under the button, `negative`, `role="alert"`. The button comes back with focus.
18. Empty account: no counts, no disclosure, no button. Only "Nothing to export yet. Once you add a game, a rating or a thought, you can download it here."

Import: availability

19. Lead sentence, always: "Put an export back into this account. Import works only into an empty account, so it never mixes with or overwrites what you have."
20. Account with data: then, in `ink`, "This account already has games, ratings or thoughts, so import is not available here. To put a file back, use a new, empty account." No file control.
21. Empty account means no copies (archived included), no ratings, no thoughts and no games created by the person. The screen decides from the counts. The server checks again at import time.
22. Empty account: a quiet bordered button "Choose a file" and under it the hint "A .json file made by Export, up to 10 MB." (14px, `ink-soft`).
23. The control is a real `<input type="file" accept=".json,application/json">`, visually hidden but focusable, with a styled label. Its accessible name is the visible label, it is described by the hint, and the label shows the 2px accent focus ring when the input has keyboard focus.
24. Closing the picker without a file changes nothing.

Import: the check on the device

25. Over 10 MB: refused from the size alone, with the A14 message: "“{file}” is {size}, and the limit is 10 MB. Choose the .json file that Export downloaded."
26. While reading and checking: "Checking {file name}" under the hint, the file button aria-disabled, a polite "Checking your file".
27. Not JSON, or no `"format": "meeple-journal-export"`, or a version that is not a whole number: "“{file}” is not a Meeple Journal export. Choose the .json file that Export downloaded."
28. `version` above 1: "“{file}” was made by a newer version of Meeple Journal (format {version}). This version reads format 1 only."
29. Content refused by the shared Zod schema: "“{file}” has {n} problems, so nothing can be imported:" ("1 problem"), then the first five problems in file order as a list (14px, `ink`), then "and {n} more." when there are more, then the hint "If the file was edited by hand, fix these and choose it again."
30. Problem lines use exactly the templates in section 4, "Import: checking the file", including the fallback.
31. No games in a valid file: "“{file}” has no games in it, so there is nothing to import."
32. All file messages are `negative` text (the problem list in `ink`) inside one `role="alert"` container under the hint. File names break anywhere. Focus stays on the file button, which now reads "Choose another file".
33. Choosing another file replaces any message or panel and checks again.

Import: the panel

34. A raised panel under the hint: radius 4, padding 16 (12 on a phone, bleeding 8px into the side padding), `role="region"` labelled by its heading.
35. Heading "Ready to import" (`h4`, 17px Schibsted Grotesk 600, `tabindex="-1"`). Focus moves to it when the panel opens.
36. File line: the file name in `ink` (breaks anywhere), new line "{size} · exported {date}" in `ink-soft`. The date is `exported_at` as a local date in the "10 November 2026" format.
37. A `dl` in two columns: "Games", "Copies" ("{n}, {a} of them archived", or "{n}" when none), "Status changes", "Ratings", "Thoughts". All five rows always show.
38. Cover note when any game has a cover reference: "Covers are not in the file. {n} of these games had a cover; they arrive with their initial, and you can add the cover again on the game page." Singular: "1 of these games had a cover; it arrives with its initial, and you can add the cover again on the game page." No note when there are none.
39. Footer right-aligned: "Cancel" (quiet bordered), "Import" (primary). Wraps on a narrow screen and keeps the right alignment.
40. Cancel: closes the panel, forgets the file, the button reads "Choose a file", and focus goes to it. No message.

Import: saving

41. Import sends the file to one server action. The server takes the user from the session (never from the file), runs the same schema check, and calls one database function that checks the account is still empty and writes everything in one transaction.
42. Pending: "Import" reads "Importing", aria-disabled, keeps focus. "Cancel" and "Choose another file" are aria-disabled. Above the footer, in `ink`: "Importing {n} games with their history, ratings and thoughts. This can take a minute. Keep this page open." Singular: "Importing 1 game with its history, ratings and thoughts. This can take a minute. Keep this page open." A polite "Importing".
43. While pending, a `beforeunload` handler asks the browser's "Leave site?" question. It is removed when the import ends.
44. Success: the panel becomes the result panel (same surface, `role="status"`). Heading "Import complete" (`tabindex="-1"`, focused). Then "This account now has {games} games, {copies} copies, {changes} status changes, {ratings} ratings and {thoughts} thoughts." (counts from the server, with singular forms). Then, when covers were referenced, "{n} of these games had a cover. Add their covers again on each game page." Then "Open your Library", a link to `/library` styled as a quiet bordered button. The lead sentence and the file button are hidden.
45. After success the page data is revalidated: Export shows the new counts and "Download export". On the next visit, Import shows the sentence from line 20.
46. Failure (offline, timeout, server error): alert in the panel above the footer: "The import did not finish, and nothing was saved. Your file is fine. Try again." Buttons come back, and focus stays on Import.
47. The server check refuses the file: "The file did not pass the check on the server, so nothing was saved. Choose the file again, or export it again." Buttons come back, and focus stays on Import.
48. The account is no longer empty: "Something was added to this account after you chose the file, so nothing was imported. Import works only into an empty account." The Import button is removed, "Choose another file" stays aria-disabled, and focus goes to Cancel. Cancel shows the line 20 state, with focus on the "Import" heading (`tabindex="-1"`).
49. All or nothing: no failure leaves part of a file saved. Import is not undoable.

Keyboard and accessibility

50. Keyboard order: Sign out, "What is in the file", "Download export", the file button, then in the panel "Cancel" and "Import", and after success "Open your Library".
51. Every control is at least 44px tall, has an accessible name, and shows the 2px accent focus ring with an offset. Nothing needs hover or a pointer.
52. Live regions: a polite region in Export (download started) and one in Import (checking, importing). Errors use `role="alert"`. Focus moves exactly as in lines 15, 17, 32, 35, 40, 44, 46, 47 and 48.
53. No horizontal overflow at 390px. Long file names and long titles wrap.
54. Checked with Playwright at 1280 and 390: account with data, empty account, disclosure open, export pending, success and failure, the check states, the panel, importing, success and each failure.

Data and rules

55. The file format is version 1 as in section 5, nested per game, two-space indented. One Zod schema, used by the export, the device check and the server.
56. The export holds every game the person created or has records on, every copy (archived included, all columns), every status change, every rating, every thought, and a cover reference (path, width, height, colours, or null). No image files, no drafts, no profile, no editions.
57. Import makes new ids. It keeps `created_at`, `archived_at`, `changed_on`, `recorded_at`, `assessed_on`, `written_on` and `updated_at` from the file. Games are created private and manual, owned by the session user.
58. No new table or column. The import goes through one database function tied to `auth.uid()`, which passes the history guard and the timestamp triggers on purpose. This needs a new ADR (it changes the "service-role path" in ADR-0009) and a `db-security-reviewer` run.
59. Tests: the round-trip (export A, import into empty B, export B; equal except `id`, `exported_at` and `cover`); import refused for a non-empty account; another user can never export or import into someone else's data (two users); each file check message; all or nothing on a failure in the middle of the import.

## Not checked

- No real phone, no screen reader and no keyboard run-through: the drawings are static HTML.
- Download behaviour differs by browser (Android Chrome, iOS Safari, a desktop "Save as" prompt). "Download started" means the browser was handed the file, not that it was saved. Not tested on a device.
- File size and import time for a large library are estimates (about 7 KB per game with a few thoughts). The time limit for a server action on the hosting plan was not checked against an import of about 9 MB.
- The visually hidden file input with a styled label (line 23) is described, not built. Its focus ring on the label needs a check in a browser.
- Contrast was not measured again. Only the existing token pairs are used (`ink`, `ink-soft` and `negative` on `canvas` and `raised`).
- The concept sheet was checked with Playwright at 1280 and 390 over a local HTTP server, because the browser tool blocks `file://` URLs.
