# L7 Thoughts: UX concept

Status: **Option B approved** by the user on 4 November 2026; its contract is the last section, "Option B implementation contract (approved)". Options A and C below were not chosen and are kept for reference. Drawings: `index.html` in this folder (open it in a browser; it needs internet for the Google Fonts). Approved direction: "Concept C, topic notebook" (4 November 2026).

## 1. Understanding

On the game page, the owner writes short, dated opinions about the game ("thoughts"). They can mark each thought with none, one or several of nine topics, and later reread what they think about one part of the game by choosing a topic tab. The person wants a calm page and no per-part scores. The rating stays as it is (one number in the facts row) and is not redesigned.

Assumptions:

- The topics are a fixed list of nine for now: Mechanics, Theme, Artwork, Components, Production, Replayability, Solo mode, Interaction, Combat. You cannot add or hide topics. (The spec mentions hiding dimensions; that was about scores and is not carried over.)
- A thought belongs to a person and a game, not to a copy. Any game the person can see can get thoughts, owned or not (the same rule as ratings).
- The date shown is the day the thought was written, in the person's local time. Editing does not change it.
- One person per account, so there is no author name on a row.
- Light Markdown (ADR-0005): bold, italics, lists, links; sanitised on render; edited as plain text.
- Thoughts for one game are few (tens, not thousands), so the page loads all of them for that game at once and filters on the device.
- Thoughts sit directly under Status, before the game description, as in the approved sketch.

## 2. Options

All three keep the approved structure (heading, topic filter, dated list, newest first). They differ in where you write and how the filter is laid out.

### Option A: Inline line (not chosen; was the recommendation)

- At rest: the heading "Thoughts", then one quiet field-like line, "Add a thought". Tabs below it, then the list.
- Focusing the line opens it in place: a text box, the nine topic toggles, a hint, Cancel and Save.
- Tabs: All plus only the topics that have thoughts. Desktop wraps to a second line when needed; phone keeps one row that scrolls sideways.
- Rows: date in a left column (desktop) or above (phone), the text, its topics in small lowercase, and a quiet "Edit". Edit opens in place in the row. Delete lives inside edit mode.
- Trade-off: one more line on the page at rest than the sketch (the line replaces the "+ Add thought" link). On a phone some tabs are out of view until you scroll.

### Option B: Link opens the composer (approved)

- At rest: heading plus a quiet "+ Add thought" link (closest to the sketch). The link opens the same composer at the top of the section, already focused.
- Rows: small uppercase date label above the text, hairline between rows, and a "···" menu per row for Edit and Delete.
- Tabs wrap onto several rows on a phone.
- Trade-off: the calmest page at rest. But every thought costs one extra tap, there is a "···" button on every row, and with many topics the wrapped tabs push the list down by two or three rows on a phone.

### Option C: Topic index and a writing dialog (not chosen)

- Desktop: a short index column on the left inside the section, always showing All and all nine topics with counts (empty ones faint). Phone: one select, "Topic: All (7)".
- "+ Add thought" opens a dialog (desktop) or bottom sheet (phone). Edit opens the same dialog, with Delete in it.
- Trade-off: scales best and the page does not move while you write. But it is the heaviest at rest (a second column in the body), the phone select hides the counts, and a modal feels less like a notebook.

## 3. States drawn for Option A

All at 1280 and 390 in `index.html` under "Option A: every state": 1 empty · 2 loading · 3 load error · 4 default · 5 composer open, empty · 6 composer with text and topics · 7 validation, no text · 8 near the length limit · 8b over the limit · 9 saving · 10 save failed · 11 saved · 12 draft restored · 13 discarded with Undo · 14 filtered by a topic · 15 selected topic became empty · 16 all nine topics in use · 16b phone tabs scrolled to the end · 17 long game title and long text, collapsed · 17b long text expanded · 18 many thoughts (Show 10 more) · 19 edit open · 19b edit saving · 19c edit failed · 20 delete confirm open · 20b deleting · 20c deleted.

Closed and open states: composer (4 and 5), "Show all" (17 and 17b), delete confirm (19 and 20). The Manage menu, Cover chip and rating popover are unchanged.

## 4. Behaviour notes (Option A)

### Composer

- Collapsed: a `textarea` with one visible row, styled like a quiet field, placeholder "Add a thought". Accessible name "New thought" (visually hidden label).
- Focus (tap, click or Tab) opens it: the text box grows to about five rows (it grows with the text up to about 16 rows, then scrolls), and the topic toggles, hint, Cancel and Save appear under it. Focus stays in the text box.
- It closes again when focus leaves the composer and there is no text and no topic chosen. With text or a topic chosen, it stays open.
- Topics: nine toggle buttons (`aria-pressed`), always all nine, in the fixed order, wrapping (three rows on a phone). Multi-select. None is fine. Pressed look is the same as the Status picker (`pressed-glow`, raised surface, ink text).
- Default topics: none, except when a topic tab is selected; then that topic starts pressed (see question Q4).
- Save: validates, then saves. Cancel: see below. Ctrl+Enter (Cmd+Enter on Mac) in the text box saves. Escape does the same as Cancel.
- Cancel with no text: closes, no message. Cancel with text: closes, clears the text and the draft, and shows "Draft discarded." with an "Undo" button. Undo puts back the text and topics, opens the composer and focuses the text box. The Undo line goes away when the composer is opened again or the page is left.

### Drafts (ADR-0005)

- New thought: local storage key `draft:thought:new:<gameId>`, holding the text and the topics, written about half a second after each change.
- Edit: key `draft:thought:edit:<thoughtId>`.
- Cleared after a successful save, on Cancel, and on "Discard draft" or "Discard changes".
- On return with a new-thought draft: the composer is open with the text and topics, and shows "Restored your unsaved draft." plus a "Discard draft" button. Focus is not moved (the page opens normally).
- Opening Edit on a thought that has an edit draft fills the box from the draft and shows "Restored your unsaved changes." plus "Discard changes" (which puts back the saved text and topics).
- A draft with only whitespace and no topics is not kept.
- Drafts are per device. The hint says so.

### Validation (on Save, on the server too)

- Text is trimmed. Empty: "Write something before you save." Focus goes to the text box, which gets `aria-invalid`.
- Limit 10,000 characters. From 500 left, a counter replaces the hint: "{n} characters left". Over the limit: "{n} characters too many" in the negative colour. Saving over the limit: "This thought is too long. Keep it to 10,000 characters." Focus goes to the text box.
- Topics: only the nine keys, no duplicates. The UI cannot send anything else; a bad value from elsewhere gets the generic save error.

### Saving

- Pending: Save reads "Saving" and is disabled, Cancel and the toggles are disabled, the text box is read-only. The rest of the page stays usable.
- Success: the composer closes and clears, the draft is removed, the new thought is first in the list with a raised background that fades out over about 2 seconds (no fade with reduced motion; it just shows without the background). Counts update. A polite status says "Thought saved." Focus moves to the new row (the row is focusable with `tabindex="-1"`).
- If a topic tab is selected and the new thought does not have that topic, the filter switches to All, so the new thought is visible.
- Failure (offline, server error, timeout): "Could not save your thought. It is still here and on this device. Try again." as an alert above the buttons. The text, topics and draft stay, Save is enabled again, focus stays on Save. No retry queue, no offline sync.

### Topic tabs

- A group of buttons with `aria-pressed`, single select, labelled "Show thoughts about". Not ARIA tabs.
- Shown only when at least one thought has a topic. Order: All, then the topics in the fixed order. Only topics with at least one thought appear.
- Each shows its count. Accessible name: "Mechanics, 3 thoughts" (and "All, 7 thoughts"; "1 thought" in the singular).
- Selected: ink text, 2px underline in the cover glow (ink without a cover), count in ink-soft.
- Choosing a tab filters the list on the device (no reload), resets the list to the first 10, and keeps focus on the tab. The choice is not kept in the URL and is not remembered (All on each visit).
- Desktop: the tabs wrap. Phone (below `md`): one row that scrolls sideways with no visible scrollbar, and a fade on the side that has more. Choosing a tab scrolls it fully into view.
- If the selected topic drops to 0 (its last thought deleted or edited), the tab stays with "0" and the list shows "No thoughts about artwork." and a "Show all thoughts" button (selects All and focuses the All tab). Once another tab is chosen, the empty tab disappears.

### List rows

- Newest first: by written date, then by created time.
- Date: `formatChangeDate` (for example "2 November 2026"), the same format as Status history. Desktop: a 9rem left column. Phone: above the text.
- Text: rendered light Markdown, paragraphs and single line breaks kept, long words broken. Max width 65ch.
- Long text: over six lines it is cut with an ellipsis and a "Show all" button (`aria-expanded`). It becomes "Show less". Focus stays on that button.
- Topics: in the All view, all of the row's topics in lowercase joined with " · ". In a topic view, only the others, as "also: theme · artwork". Nothing if there are none.
- "Edit": quiet link-style button, accessible name "Edit thought from 2 November 2026".
- Ten rows first. Then a quiet button "Show 10 more" (or "Show {n} more" for the last step) and "10 of 34 shown". New rows are added below; focus moves to the first new row.

### Edit

- Edit replaces the row in place with the same box, filled in, and the topics as saved. The date stays in its column. Focus goes to the end of the text.
- Only one row is in edit mode at a time. Opening another closes the first; any unsaved changes there stay as its draft.
- Buttons: "Delete thought" (quiet, left), "Cancel", "Save changes" (primary, right). Escape and Cancel close it without saving, clear the edit draft, and focus the row's Edit button.
- Save changes: same validation and pending rules as a new thought. Success: back to the read view, polite status "Changes saved.", focus on the row. Its place in the list does not change. Failure: "Could not save your changes. They are still here and on this device. Try again."
- No "edited" marker on the row (see Q3).

### Delete

- "Delete thought" opens a confirm inside the box: "Delete this thought? Its text and topics are removed for good. This cannot be undone." with "Cancel" and "Delete thought" (negative border). The toggles are disabled while it shows. Focus goes to Cancel.
- Cancel or Escape closes the confirm and focuses "Delete thought".
- Pending: "Deleting", both buttons disabled.
- Success: the row is removed, counts drop, polite status "Thought deleted.", the edit draft is removed. Focus goes to the next row, or the previous one, or the "Thoughts" heading (`tabindex="-1"`) when the list is now empty.
- Failure: "Could not delete this thought. Try again." The confirm stays open.
- Not undoable (consistent with "Delete permanently" for a copy).

### Empty, loading, error

- No thoughts: no tabs, no list. Under the composer: "No thoughts yet. Write what you think of the game, and mark the parts it is about." Once there is a thought, this line goes.
- Loading: the section streams in its own Suspense boundary after the rest of the page. Skeleton: the heading, a 44px bar for the composer, three short bars for tabs, three rows of bars. `aria-busy`, and a visually hidden status "Loading your thoughts". No shimmer.
- Load error: "Could not load your thoughts." and a "Try again" link (reloads the game page), in a raised box with `role="alert"`. No composer and no tabs. A draft in local storage is not touched and comes back once loading works.

### Keyboard order

Status buttons → (composer) text box → topic toggles 1 to 9 → Cancel → Save → topic tabs, All first → for each row: "Show all" if present, then Edit → "Show 10 more" → the description and the rest of the page. In edit mode: text box → toggles → Delete thought → Cancel → Save changes. In the confirm: Cancel → Delete thought. All targets are at least 44px tall with a visible 2px accent focus ring.

### Offline and failure

No offline queue (ADR-0005). Any failed write keeps the text on screen and in the draft and shows the calm retry message. Reading needs the page to load.

## 5. Data needs

What the screen needs, per game: all of the person's thoughts with id, body, topics, written date and created time. Counts are computed on the device.

Proposed (for the plan, not decided here):

- A personal table. The architecture already proposes `journal_entries` (game_id, body markdown, created_at, updated_at, plus later play_session_id, campaign_id, tone). Default: use `journal_entries` so the Phase 2 journal (J3) reuses it, with only the columns L7 needs:
  - `id uuid`, `user_id uuid` (owner, RLS), `game_id uuid not null`, `body text not null` (1 to 10,000 characters after trim), `topics text[] not null default '{}'` (only the nine keys, no duplicates), `written_on date not null` (the person's local today, sent by the screen as ratings do), `created_at`, `updated_at`.
  - Topic keys: `mechanics`, `theme`, `artwork`, `components`, `production`, `replayability`, `solo_mode`, `interaction`, `combat`. Labels live in the app.
  - RLS: owner-only select, insert, update and delete (update and delete only if Q1 is yes). Two-user isolation test.
  - `game_id` references `games` with `on delete no action` (ADR-0011, ADR-0012), and `delete_entry()` keeps the game when it has thoughts.
  - An index on (user_id, game_id, written_on desc, created_at desc).
- Topics as an array on the row, rather than a child table, because the list is fixed and small. A child table is the alternative if the plan prefers it.
- L8 export must include thoughts.

Out of scope, not designed: tone (positive, negative, observation, in PRODUCT_SPEC 5.3), links to plays and campaigns, photos, sharing, search across games, a global journal page, Quick Capture (J2), undo for delete (J6 "undo where cheap"). Q5 to Q7 ask about some of these.

## 6. Recommendation and questions

Recommendation: Option A. It keeps the approved notebook structure and the calm look. Writing takes one tap, as fast as the spec target for a thought (under 10 seconds). The page does not jump when the composer opens on a phone, because the tabs stay in one row. Delete is kept out of the list, so rows carry only one quiet control.

Open decisions (my default in brackets):

- Q1. Can the owner edit and delete a thought? Unlike ratings, which are append-only. [Yes. Edit in place; delete only from edit mode, with a confirm and no undo.]
- Q2. Option A replaces the sketch's "+ Add thought" link with an always-visible "Add a thought" line. Is that fine, or keep the link (Option B composer)? [Use the line.]
- Q3. Mark edited thoughts, for example "2 November 2026 · edited"? [No marker. `updated_at` is stored anyway.]
- Q4. When a topic tab is selected, should a new thought start with that topic pressed? [Yes, and it can be unpressed.]
- Q5. The spec lists an optional tone (positive, negative, observation) for thoughts. Add it? [No. It was not asked for and topics cover the need for now.]
- Q6. Can you choose the date of a thought (for example, writing up last week's game)? [No, always today, like ratings.]
- Q7. Keep Ctrl+Enter / Cmd+Enter to save? [Yes. It is small and does not show on screen.]
- Q8. Ten rows per step before "Show 10 more". [10.]
- Q9. Text limit. [10,000 characters.]
- Q10. Table name: reuse `journal_entries` from the architecture, or a separate `thoughts` table? [`journal_entries`, decided in the plan with an ADR.]

## 7. Implementation contract (Option A, not chosen; see the Option B contract below)

Placement and structure

1. A section "Thoughts" (`h2`, same style as "Status") sits directly under the Status section and above the description, in the body column, on every game page the person can see (owned or not).
2. Order inside the section: heading, composer, (message line if any), topic tabs, list, "Show more" row.
3. Only tokens are used. No new colours. Pressed toggles and the selected tab use `pressed-glow` / `--game-glow` with the ink fallback.
4. Nothing in the hero, facts row, rating popover, Manage menu or Cover chip changes.

Composer

5. Collapsed: one-row `textarea`, min 44px tall, `edge` border, radius 2, max width 42rem, placeholder "Add a thought", visually hidden label "New thought".
6. On focus it opens in place: raised surface, radius 4, padding 16 (12 on a phone), the text box at about five rows growing to about 16, then scrolling.
7. Under the text box: label "Topics" with "(optional)", then nine toggle buttons in this order: Mechanics, Theme, Artwork, Components, Production, Replayability, Solo mode, Interaction, Combat. `aria-pressed`, group `aria-label` "Topics for this thought", 44px tall, wrapping.
8. Footer: the hint "Light Markdown works: **bold**, *italics*, lists, links. A draft stays on this device until you save." on the left (its own line on a phone), "Cancel" (quiet button) and "Save" (primary) on the right.
9. Closes again when focus leaves with no text and no topic pressed. Stays open otherwise.
10. When a topic tab other than All is selected, opening the composer presses that topic (Q4).
11. Ctrl+Enter / Cmd+Enter in the text box saves. Escape acts as Cancel.
12. Cancel with no text closes, no message. Cancel with text closes, clears text, topics and draft, shows "Draft discarded." and an "Undo" button, and focuses Undo.
13. Undo restores text and topics, opens the composer, focuses the text box. The Undo line goes when the composer opens again or the page is left.

Drafts

14. New-thought draft in local storage under `draft:thought:new:<gameId>` (text plus topics), written about 500 ms after a change. Whitespace-only text with no topics is not stored.
15. Edit draft under `draft:thought:edit:<thoughtId>`.
16. Drafts are cleared after a successful save, on Cancel, and on Discard.
17. On load with a new-thought draft: the composer is open, filled, with "Restored your unsaved draft." and a "Discard draft" button. Focus is not moved.
18. Opening Edit with an edit draft: filled from the draft, with "Restored your unsaved changes." and "Discard changes" (restores the saved version and removes the draft).

Validation

19. Text is trimmed on client and server. Empty: "Write something before you save." Focus to the text box, `aria-invalid="true"`, message linked with `aria-describedby`.
20. Limit 10,000 characters. With 500 or fewer left, the hint is replaced by "{n} characters left". Over: "{n} characters too many" in `negative`.
21. Saving over the limit: "This thought is too long. Keep it to 10,000 characters." Focus to the text box.
22. Server accepts only the nine topic keys, without duplicates. One Zod schema shared by form and server action.

Saving a new thought

23. Pending: Save reads "Saving", disabled; Cancel and toggles disabled; text box read-only.
24. Success: composer closes and clears, draft removed, new thought first in the list, counts updated.
25. The new row shows a raised background that fades over about 2 seconds; with `prefers-reduced-motion` there is no fade and no background.
26. Polite live region: "Thought saved." Focus to the new row (`tabindex="-1"`).
27. If the selected tab is not one of the new thought's topics, the filter switches to All.
28. Failure: alert "Could not save your thought. It is still here and on this device. Try again." Text, topics and draft kept, Save enabled, focus on Save.

Topic tabs

29. Shown only when at least one thought has a topic. Group of buttons with `aria-pressed`, single select, `aria-label` "Show thoughts about".
30. "All" first, then only topics with at least one thought, in the fixed order. Each shows its count in `ink-faint`, 12px.
31. Accessible names: "All, 7 thoughts", "Mechanics, 3 thoughts", "Combat, 1 thought".
32. Selected: ink text, weight 500, 2px glow underline. Default on every visit: All. Not stored in the URL.
33. Choosing a tab filters on the device, resets to the first 10 rows, keeps focus on the tab.
34. Desktop (`md` and up): tabs wrap. Phone: one row, horizontal scroll, no visible scrollbar, a fade on the side with more; the chosen tab scrolls fully into view.
35. If the selected topic drops to 0, its tab stays with "0" and the list shows "No thoughts about {topic in lowercase}." and a "Show all thoughts" button (selects All, focuses the All tab). The 0 tab disappears once another tab is chosen.

List rows

36. Order: `written_on` newest first, then `created_at` newest first.
37. Date with `formatChangeDate` ("2 November 2026") in `<time datetime>`. Desktop: 9rem left column. Phone: above the text.
38. Body: light Markdown (bold, italics, lists, links), sanitised; paragraphs and single line breaks kept; long words break; max width 65ch.
39. Over six lines: clamped with "Show all" (`aria-expanded="false"`), which becomes "Show less". Focus stays on the button.
40. Topics line: All view shows all of the row's topics, lowercase, joined " · ". A topic view shows only the others as "also: …". Nothing if none.
41. "Edit" quiet button on each row, 44px target, `aria-label` "Edit thought from {date}".
42. First 10 rows. Then "Show 10 more" (or "Show {n} more") and "{shown} of {total} shown". Focus to the first added row.
43. Empty list (no thoughts at all): no tabs; text "No thoughts yet. Write what you think of the game, and mark the parts it is about."

Edit

44. Edit replaces the row in place with the composer layout, filled with the saved text and topics; the date stays visible in its column; focus at the end of the text.
45. One row in edit mode at a time; opening another closes the first (its changes stay as a draft).
46. Footer: "Delete thought" (quiet, left; on its own line if space is short), "Cancel", "Save changes" (primary).
47. Cancel or Escape: back to read view, edit draft cleared, focus to that row's Edit.
48. Save changes: same validation; pending "Saving"; success returns to read view in the same place, polite "Changes saved.", focus to the row; `written_on` unchanged, `updated_at` set.
49. Failure: "Could not save your changes. They are still here and on this device. Try again."

Delete

50. "Delete thought" shows the confirm inside the box: "Delete this thought? Its text and topics are removed for good. This cannot be undone." Buttons "Cancel" and "Delete thought" (negative border). Toggles disabled. Focus to Cancel.
51. Cancel or Escape closes the confirm and focuses "Delete thought".
52. Pending: "Deleting", both buttons disabled.
53. Success: row removed, counts updated, edit draft removed, polite "Thought deleted.", focus to the next row, else the previous one, else the "Thoughts" heading (`tabindex="-1"`).
54. Failure: "Could not delete this thought. Try again." The confirm stays open.

Loading and errors

55. The section loads in its own Suspense boundary with the skeleton drawn in state 2, `aria-busy="true"` and a visually hidden "Loading your thoughts".
56. Load failure: raised box with `role="alert"`: "Could not load your thoughts." and a "Try again" link to the same game page. No composer, no tabs. Local drafts untouched.

Accessibility and layout

57. Every control is at least 44px tall, has an accessible name, and shows the 2px accent focus ring with offset.
58. Keyboard order as in section 4. Nothing needs a pointer or hover.
59. No horizontal page overflow at 390px. The tabs row is the only thing that scrolls sideways.
60. Checked with Playwright at 1280 and 390, including the composer open, edit mode and the delete confirm.

Data and rules (for the plan)

61. Personal table with `user_id`, RLS on, owner-only policies for every allowed operation, and a two-user isolation test.
62. `game_id` uses `on delete no action`; `delete_entry()` keeps a game that has thoughts; removing or archiving a copy never touches thoughts.
63. The server takes the user from the session, never from the form. `written_on` comes from the screen's local today, within the same range check as ratings.
64. Thoughts are included in the L8 export.

## Not checked

- No real phone, no screen reader, no keyboard run-through: the drawings are static.
- The fade and the sideways-scrolling tabs are drawn, not built. Scroll feel and the fade on real touch devices are not checked.
- Line clamping with real Markdown (lists, links) is drawn with sample HTML, not with the app's renderer.
- Contrast was not measured again. Only existing token pairs are used (ink-soft and ink-faint text on canvas and raised, as elsewhere in the app).
## Option B implementation contract (approved)

Approved by the user on 4 November 2026: Option B, "Link opens the composer". Options A and C are not chosen and stay above for reference only. Where this section and sections 3 to 7 disagree, this section wins.

Every state is drawn in `index.html` under "Option B: every state (approved)", states B1 to B21d, at 1280 (body column) and 390. Each state has an anchor, for example `index.html#st-b19`.

The user's answers: Q1 edit and delete by the owner, yes. Q2 not applicable (B uses the link). Q3 no "edited" marker. Q4 a new thought starts with the selected topic tab pressed, and can be unpressed. Q5 no tone. Q6 no date choice, always today. Q7 Ctrl+Enter / Cmd+Enter saves. Q8 10 rows per "Show more". Q9 10,000 characters. Q10 `journal_entries`, with only the L7 columns (decided by the main agent).

### Decisions made while completing B

These were not settled by the drawing or the answers. Check them quickly; each has a contract line.

- D1. The composer does not close when focus leaves it. Only Cancel, Escape, a successful save or "Discard draft" close it. (Option A closed on blur; B has a link to reopen, so no need.) Line 9.
- D2. The "+ Add thought" link is hidden while the composer is open, and also while the section is loading or failed to load. Lines 6, 75, 76.
- D3. One composer at a time in the section. Opening Edit closes the new-thought composer, and the other way round; text in the one that closes stays as its draft on the device and comes back as "Restored ..." when reopened. Line 46.
- D4. The "···" menu works like the Manage menu: a disclosure (button plus panel of ordinary buttons), not an ARIA menu. Tab and Shift+Tab move through Edit and Delete. Arrow keys do nothing. Unlike Manage, Tab past Delete (or Shift+Tab before Edit) closes it, because a page can have many of these menus. Lines 37 to 43.
- D5. The menu opens under its button with the right edges lined up, so it grows to the left into the column and never touches the page edge. If the room below the button in the viewport is less than the panel height plus 8px, it opens above the button instead (drawn in B19b). Line 39.
- D6. Delete lives only in the "···" menu. Edit mode has Cancel and Save changes, no Delete. The "···" button is hidden on a row while that row is in edit or delete-confirm mode. Lines 32, 48, 56.
- D7. After the delete confirm is cancelled, and after an edit is cancelled or Escaped, focus goes to that row's "···" button (it is visible again). Lines 53, 57.
- D8. Wrapped tabs: no side padding on a tab, a 24px gap on desktop and 20px on a phone, each tab at least 44px wide and 44px tall, the underline under the label and count only, and one hairline under the whole group. This lines every wrapped line up on the column's left edge. It is a small tidy-up of the Option B overview drawing, where tabs had 12px side padding; the look is otherwise the same. With all nine topics: two lines on desktop, three lines (132px) on a 390 phone. Line 25.
- D9. When an edit removes the selected topic from a thought (but other thoughts keep that topic), the thought leaves the filtered list on save. Focus goes to the next row, else the previous one, else the heading. The polite status says "Changes saved. It is no longer under {topic in lowercase}." If that was the last thought with the topic, the empty-topic state (B15) shows. Line 51. Not drawn as its own state.
- D10. The topic is pressed in advance only when the composer opens. Changing the tab while the composer is open does not change the pressed topics. A restored draft keeps its own topics (no pre-press). Line 11.
- D11. "Discard draft" behaves like Cancel with text: it closes the composer, clears the draft, and shows "Draft discarded." with Undo. Line 19.
- D12. In the empty state, the help line hides while the composer is open and comes back when it closes without a save (B1b). Line 73.
- D13. "Show all" for a long thought sits at the start of the topics line, not on its own line. Line 35.
- D14. Menu items show "Edit" and "Delete"; their accessible names add the date ("Edit thought from 2 November 2026"). Two thoughts on the same day get the same names; the row text right next to them tells them apart. Line 38.
- D15. Escape closes the innermost open thing only: the menu, else the delete confirm, else the composer (as Cancel). Line 43.

### Needs the user's decision

None of the decisions above blocks the build. D9 (copy "Changes saved. It is no longer under artwork.") and D4 (Tab out closes the menu, unlike Manage) are the two most worth a look.

### Checklist

Placement and structure

1. A section "Thoughts" sits directly under the Status section and above the description, in the body column, on every game page the person can see (owned or not).
2. Section header: the `h2` "Thoughts" (same style as "Status", 22px Schibsted Grotesk, 600) on the left and the quiet link-style button "+ Add thought" on the right, on one line (`justify-content: space-between`, vertically centred). The heading has `tabindex="-1"` so focus can be sent to it.
3. Order inside the section: header, composer (when open), message line (when any), topic tabs, list, "Show more" row.
4. Only tokens are used. No new colours. Pressed topic toggles and the selected tab use `pressed-glow` / `--game-glow`, with the ink fallback when the game has no cover colours.
5. Nothing in the hero, facts row, rating popover, Manage menu or Cover chip changes.

"+ Add thought" and the composer

6. "+ Add thought" is a `button` styled as a quiet text link (`ink-soft`, underlined, 14px, at least 44px tall). Accessible name "Add thought" (the "+" is `aria-hidden`). It is hidden while the composer is open.
7. Activating it opens the composer directly under the header and moves focus into the text box.
8. The composer is the Option A open composer, unchanged: raised surface, radius 4, padding 16 (12 on a phone, bleeding 8px into the side padding), max width 42rem, lift shadow. Inside: the text box, the topic toggles, the footer. It is a `role="group"` with `aria-label` "New thought". The text box has the visually hidden label "New thought" and the placeholder "Add a thought".
9. It does not close when focus leaves it. It closes on Cancel, Escape, a successful save, or "Discard draft".
10. Text box: about five rows tall at first, grows with the text up to about 16 rows, then scrolls. 16px text.
11. Topics: label "Topics" with "(optional)", then nine toggle buttons with `aria-pressed`, in this order: Mechanics, Theme, Artwork, Components, Production, Replayability, Solo mode, Interaction, Combat. Group `aria-label` "Topics for this thought". Each 44px tall, wrapping (four lines on a 390 phone). Multi-select; none is fine. When the composer opens while a topic tab other than All is selected, that topic starts pressed (Q4). It can be unpressed. Changing the tab later does not change the toggles. A restored draft keeps its own topics.
12. Footer: the hint "Light Markdown works: **bold**, _italics_, lists, links. A draft stays on this device until you save." on the left (its own line on a phone), "Cancel" (quiet bordered button) and "Save" (primary) on the right.
13. Ctrl+Enter (Cmd+Enter on Mac) in the text box saves. Escape anywhere in the composer acts as Cancel.
14. Cancel with no text and no topic changes: the composer closes, no message, focus goes to "+ Add thought".
15. Cancel with text: the composer closes, text, topics and draft are cleared, the line "Draft discarded." with an "Undo" button shows under the header, and focus goes to Undo.
16. Undo restores the text and topics, opens the composer, focuses the end of the text, and removes the line.
17. The "Draft discarded." line goes away when the composer is opened again or the page is left.

Drafts

18. New-thought draft in local storage under `draft:thought:new:<gameId>` (text plus topics), written about 500 ms after each change. Whitespace-only text with no topics is not stored (and removes an existing draft).
19. On load with a new-thought draft: the composer is open (the link hidden), filled with the draft's text and topics, with the line "Restored your unsaved draft." and a "Discard draft" quiet button at its top. Focus is not moved. "Discard draft" does what Cancel with text does (line 15).
20. Edit draft under `draft:thought:edit:<thoughtId>`, same timing.
21. Opening Edit on a thought that has an edit draft fills the box from the draft and shows "Restored your unsaved changes." and "Discard changes". "Discard changes" puts back the saved text and topics, removes the draft, and keeps edit mode open with focus in the text box.
22. Drafts are removed after a successful save, on Cancel, on Discard, and (edit draft) when the thought is deleted.

Topic tabs

23. Shown only when at least one thought has a topic. A group of buttons with `aria-pressed`, single select, `aria-label` "Show thoughts about". Not ARIA tabs.
24. "All" first, then only the topics with at least one thought, in the fixed order. Each tab shows its label and its count (count in `ink-faint`, 12px). Accessible names: "All, 7 thoughts", "Mechanics, 3 thoughts", "Combat, 1 thought".
25. Layout at every width: tabs wrap onto as many lines as needed. No side padding on a tab, 24px gap on desktop, 20px gap below `md`, each tab at least 44px wide and 44px tall. Every line starts at the column's left edge. One 1px `line` hairline under the whole group. Nothing scrolls sideways. With all nine topics: two lines at 1280, three lines (132px) at 390.
26. Selected tab: `ink` text, weight 500, a 2px glow underline under the label and count, count in `ink-soft`. Unselected: `ink-soft`.
27. Default on every visit: All. Not stored in the URL, not remembered.
28. Choosing a tab filters on the device (no reload), resets the list to the first 10 rows, and keeps focus on the tab.
29. If the selected topic drops to 0 (its last thought deleted or edited), its tab stays with "0" and the list shows "No thoughts about {topic in lowercase}." and a quiet "Show all thoughts" button, which selects All and focuses the All tab. The 0 tab disappears once another tab is chosen.

List rows

30. Order: `written_on` newest first, then `created_at` newest first. Editing does not move a row.
31. Each row is an `article` with `tabindex="-1"`. Rows are separated by a 1px `line` hairline; 18px padding above and below; the first row has no hairline and 4px top padding.
32. First line of a row: the date on the left, the "···" button on the right. The date is a small uppercase label (12px, 600, letter-spacing 0.12em, `ink-faint`) from `formatChangeDate` ("2 November 2026", shown uppercase by CSS), in `<time datetime="YYYY-MM-DD">`. The "···" button is hidden while that row is in edit or delete-confirm mode; the first line keeps its 24px height.
33. Then the text: light Markdown (bold, italics, lists, links), sanitised; paragraphs and single line breaks kept; long words break; max width 65ch; 16px `ink`.
34. Then the topics line (13px, `ink-soft`): in the All view, all of the row's topics in lowercase joined with " · "; in a topic view, only the other topics, as "also: theme · artwork". No topics line when there is nothing to show.
35. Long text: over six lines it is clamped with an ellipsis, and a quiet "Show all" button (`aria-expanded="false"`, `aria-controls` the text) sits at the start of the topics line. It becomes "Show less" when open. Focus stays on the button.
36. First 10 rows. Then a quiet bordered button "Show 10 more" (or "Show {n} more" for the last step) and the text "{shown} of {total} shown". Activating it adds the next rows below and moves focus to the first added row. The row disappears when everything is shown.

The "···" menu

37. The button: 44 by 44px, "···" glyph in `ink-soft` (`aria-hidden`), no border at rest, an `edge` border while open. `aria-expanded`, `aria-controls` the panel. Accessible name "Actions for the thought from {date}", for example "Actions for the thought from 2 November 2026".
38. The panel: raised surface, radius 4, lift shadow, 4px padding, width 12.5rem (200px), max width `calc(100vw - 2rem)`, `role="group"` with the same `aria-label` as the button. Two items, ordinary buttons in the Manage menu item style (44px tall, 14px, `ink-soft`, `canvas` background on hover and focus): "Edit" (accessible name "Edit thought from {date}") and "Delete" (accessible name "Delete thought from {date}").
39. Position: under the button with a 4px gap and the right edges lined up, so it grows to the left into the column. If the room below the button in the viewport is less than the panel height plus 8px, it opens above the button instead. It sits above the next row (z-index) and moves nothing.
40. Click or tap on the button toggles the panel. Focus stays on the button.
41. Only one menu is open at a time. Opening another, or a pointer press anywhere outside the button and panel, closes it (focus is not moved by an outside press).
42. Tab from the button goes to Edit, then Delete. Tab past Delete, or Shift+Tab back past the button, closes the panel. Arrow keys do nothing.
43. Escape closes the innermost open thing: the menu first (focus back to its button), else the delete confirm, else the composer (as Cancel).
44. "Edit" closes the menu and opens edit mode on that row (lines 46 to 53).
45. "Delete" closes the menu and opens the delete confirm in that row (lines 54 to 61).

Edit in place

46. Only one composer is open in the section: opening Edit closes the new-thought composer, and opening "+ Add thought" closes any edit. Opening Edit on another row closes the first edit. Whatever was in the closed one stays as its draft on the device.
47. Edit replaces the row's text and topics line with the same composer, filled with the saved text (Markdown source) and the saved topics. The date label stays above it. Focus goes to the end of the text. On a phone the composer bleeds 8px into the side padding, as the new one does.
48. Edit footer: "Cancel" and "Save changes" (primary) on the right. No hint, no Delete.
49. The text box's label is "Edit thought from {date}" (visually hidden).
50. Ctrl+Enter / Cmd+Enter saves changes. Escape acts as Cancel.
51. Save changes: same validation as a new thought (lines 62 to 65). Pending: "Saving", Save changes and Cancel disabled, toggles disabled, text box read-only. Success: back to the read view in the same place, edit draft removed, polite status "Changes saved.", focus on the row. `written_on` is unchanged, `updated_at` is set, nothing on the row says "edited" (Q3). If a topic tab is selected and the thought no longer has that topic, the row leaves the filtered list, focus goes to the next row, else the previous one, else the heading, and the status says "Changes saved. It is no longer under {topic in lowercase}." (line 29 applies if the count reaches 0).
52. Failure: alert "Could not save your changes. They are still here and on this device. Try again." above the footer. Text, topics and draft kept, buttons enabled again, focus on Save changes.
53. Cancel or Escape: back to the read view, the edit draft is cleared, focus goes to that row's "···" button.

Delete

54. "Delete" from the menu shows a confirm inside that row, under its text and topics: raised surface, radius 4, padding 14 by 16 (12 on a phone), max width 42rem, `role="group"` with `aria-label` "Delete thought from {date}".
55. Confirm text: "Delete this thought? Its text and topics are removed for good. This cannot be undone." Buttons: "Cancel" (quiet bordered) and "Delete thought" (`negative` text and border, no fill). Focus goes to Cancel.
56. While the confirm is open, the row's "···" button is hidden.
57. Cancel or Escape closes the confirm, and focus goes to the row's "···" button.
58. Pending: "Delete thought" reads "Deleting", both buttons disabled.
59. Success: the row is removed, counts drop, any edit draft for it is removed, polite status "Thought deleted.", focus goes to the next row, else the previous one, else the "Thoughts" heading. If the list is now empty, the empty state shows (line 72).
60. Failure: "Could not delete this thought. Try again." in `negative` inside the confirm, above the buttons. The confirm stays open, focus stays on "Delete thought".
61. Not undoable (consistent with "Delete permanently" for a copy).

Validation (client and server, one shared Zod schema)

62. Text is trimmed. Empty on Save: "Write something before you save." under the text box, the box gets `aria-invalid="true"` and `aria-describedby` the message, focus goes to the box. The message goes when text is typed.
63. Limit 10,000 characters (after trim). With 500 or fewer left, the hint is replaced by "{n} characters left" (`ink-soft`). Over the limit: "{n} characters too many" in `negative`, and the box border turns `negative`.
64. Save over the limit: "This thought is too long. Keep it to 10,000 characters." under the box, focus to the box. Nothing is sent.
65. Topics: only the nine keys, no duplicates. The UI cannot send anything else; a bad value from elsewhere gets the generic save failure message.

Saving a new thought

66. Pending: Save reads "Saving" and is disabled; Cancel and the toggles are disabled; the text box is read-only. The rest of the page stays usable.
67. Success: the composer closes and clears, "+ Add thought" is back, the draft is removed, the new thought is first in the list, counts update. Its date is today in the person's local time.
68. The new row shows a raised background (padding bleeds 12px each side, radius 4) that fades out over about 2 seconds. With `prefers-reduced-motion` there is no fade and no background.
69. Polite live region: "Thought saved." Focus goes to the new row.
70. If a topic tab is selected and the new thought does not have that topic, the filter switches to All so the new thought is visible.
71. Failure (offline, server error, timeout): alert "Could not save your thought. It is still here and on this device. Try again." above the footer. Text, topics and draft kept, Save enabled again, focus on Save. No retry queue, no offline sync.

Empty, loading, error

72. No thoughts at all: header with "+ Add thought", then the line "No thoughts yet. Write what you think of the game, and mark the parts it is about." (`ink-soft`). No tabs, no list.
73. The empty line hides while the composer is open and comes back if it closes without a save.
74. Thoughts exist but none has a topic: no tabs, the list shows as usual.
75. Loading: the section streams in its own Suspense boundary after the rest of the page. Skeleton: the heading (no link), three short bars for tabs, three rows (a short date bar and two text bars, hairlines between). `aria-busy="true"`, visually hidden "Loading your thoughts". No shimmer.
76. Load error: the heading (no link), then a raised box with `role="alert"`: "Could not load your thoughts." and a "Try again" link to the same game page. No tabs, no list. Local drafts are not touched and come back once loading works.

Keyboard order and accessibility

77. Keyboard order: Status buttons, then "+ Add thought" (or, when open, the composer: text box, the nine toggles, Cancel, Save; with a restored draft, "Discard draft" comes first; after Cancel, "Undo"), then the topic tabs (All first), then for each row: its "···" button (and, while open, Edit and Delete), then "Show all" if present; then "Show 10 more"; then the description and the rest of the page.
78. In edit mode: text box (after "Discard changes" when shown), toggles, Cancel, Save changes. In the confirm: Cancel, Delete thought.
79. Every control is at least 44px tall (tabs and "···" also at least 44px wide), has an accessible name, and shows the 2px accent focus ring with offset. Rows that receive focus show the ring around the row.
80. One polite live region for the section announces "Thought saved.", "Changes saved.", "Changes saved. It is no longer under {topic}." and "Thought deleted.". Failures use `role="alert"`.
81. Nothing needs hover or a pointer. No horizontal page overflow at 390px; nothing in the section scrolls sideways.
82. Checked with Playwright at 1280 and 390, including the composer open, a draft restored, the "···" menu open (both directions), edit mode and the delete confirm.

Data and rules

83. Table `journal_entries` (personal), only the L7 columns: `id uuid` primary key, `user_id uuid not null` (owner), `game_id uuid not null`, `body text not null` (1 to 10,000 characters after trim, also checked in the database), `topics text[] not null default '{}'` (only the nine keys, no duplicates), `written_on date not null`, `created_at`, `updated_at`. No tone, play, campaign or photo columns.
84. Topic keys: `mechanics`, `theme`, `artwork`, `components`, `production`, `replayability`, `solo_mode`, `interaction`, `combat`. Labels live in the app.
85. RLS on, owner-only policies for select, insert, update and delete (Q1). A two-user isolation test covers all four.
86. `game_id` references `games` with `on delete no action`; `delete_entry()` keeps a game that has thoughts; removing or archiving a copy never touches thoughts.
87. The server takes the user from the session, never from the form. `written_on` comes from the screen's local today (Q6), within the same range check as ratings. Edits never change `written_on`.
88. Index on (`user_id`, `game_id`, `written_on` desc, `created_at` desc). The page loads all of the person's thoughts for the game at once; filtering, counts and "Show more" happen on the device.
89. Thoughts are included in the L8 export.

### Not checked for Option B

- No real phone, no screen reader, no keyboard run-through: the drawings are static HTML.
- The menu's upward flip, the outside-press close and the Tab-out close are described, not built.
- The highlight fade, the line clamp with the app's real Markdown renderer, and the exact wrap of the tabs with the app's font loading are drawn, not measured in the app.
- The tab wrap count (two lines at 1280, three at 390) was measured on the drawing with sample counts; very long counts (three digits) could add a line on a phone.
- Contrast was not measured again. Only existing token pairs are used.
