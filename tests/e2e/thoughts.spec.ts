import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { adminClient, resetLibrary } from "../support/accounts";
import { accountFor, accountKey, storageStatePath } from "./accounts";
import { addGame } from "./helpers";

// Own account per project, so this file can change the library while other specs run.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }, testInfo) => {
  const key = accountKey(testInfo.project.name, "thoughts");
  const state = JSON.parse(readFileSync(storageStatePath(key), "utf8")) as {
    cookies: Parameters<typeof context.addCookies>[0];
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
  const account = accountFor(testInfo.project.name, "thoughts");
  await resetLibrary(account.id);
  // Thoughts keep their games alive, so clear them before the next test.
});

async function openGame(page: Page, title: string) {
  await addGame(page, title);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  return page.url().split("/").pop()!;
}

const section = (page: Page) => page.getByRole("region", { name: "Thoughts" });
const addLink = (page: Page) =>
  section(page).getByRole("button", { name: "Add thought" });
const box = (page: Page) =>
  page.getByRole("textbox", { name: /^(New thought|Edit thought from)/ });
const save = (page: Page) =>
  section(page).getByRole("button", { name: "Save", exact: true });
const toggle = (page: Page, label: string) =>
  section(page).getByRole("button", { name: label, exact: true });
const status = (page: Page) => section(page).getByRole("status");

async function seed(
  page: Page,
  gameId: string,
  testInfo: { project: { name: string } },
  rows: { body: string; topics?: string[]; written_on: string }[],
) {
  const account = accountFor(testInfo.project.name, "thoughts");
  const { error } = await adminClient()
    .from("journal_entries")
    .insert(
      rows.map((row) => ({
        user_id: account.id,
        game_id: gameId,
        topics: [],
        ...row,
      })),
    );
  expect(error).toBeNull();
  await page.reload();
}

const overflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

const rows = (page: Page) => section(page).getByRole("article");

test("the empty state has the link and one help line, and no tabs or list", async ({
  page,
}) => {
  await openGame(page, "Wingspan");
  await expect(
    section(page).getByRole("heading", { name: "Thoughts" }),
  ).toBeVisible();
  await expect(addLink(page)).toBeVisible();
  await expect(
    section(page).getByText(
      "No thoughts yet. Write what you think of the game, and mark the parts it is about.",
    ),
  ).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  await expect(
    section(page).getByRole("group", { name: "Show thoughts about" }),
  ).toHaveCount(0);
  expect(await overflow(page)).toBe(0);
});

test("write a thought with topics: it saves, shows first, and focus goes to it", async ({
  page,
}) => {
  await openGame(page, "Wingspan");
  await addLink(page).click();
  await expect(box(page)).toBeFocused();
  await expect(addLink(page)).toHaveCount(0);
  // The composer: nine topic toggles in order, none pressed.
  const group = page.getByRole("group", { name: "Topics for this thought" });
  await expect(group.getByRole("button")).toHaveText([
    "Mechanics",
    "Theme",
    "Artwork",
    "Components",
    "Production",
    "Replayability",
    "Solo mode",
    "Interaction",
    "Combat",
  ]);
  await expect(group.locator("[aria-pressed=true]")).toHaveCount(0);

  await box(page).fill("The bird cards are gorgeous.");
  await toggle(page, "Artwork").click();
  await toggle(page, "Mechanics").click();
  await expect(toggle(page, "Artwork")).toHaveAttribute("aria-pressed", "true");
  await save(page).click();

  await expect(box(page)).toHaveCount(0);
  await expect(addLink(page)).toBeVisible();
  const row = rows(page).first();
  await expect(row).toContainText("The bird cards are gorgeous.");
  await expect(row).toContainText("mechanics · artwork");
  await expect(row).toBeFocused();
  await expect(status(page)).toHaveText("Thought saved.");
  // The empty line is gone, tabs appear.
  await expect(section(page).getByText("No thoughts yet.")).toHaveCount(0);
  await expect(
    section(page).getByRole("button", { name: "All, 1 thought" }),
  ).toBeVisible();
  await expect(
    section(page).getByRole("button", { name: "Artwork, 1 thought" }),
  ).toBeVisible();
  expect(await overflow(page)).toBe(0);

  // It survives a reload, dated today.
  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first().locator("time")).toHaveAttribute(
    "datetime",
    /^\d{4}-\d{2}-\d{2}$/,
  );
});

test("text is needed: topics alone are refused, and the message sits on the box", async ({
  page,
}) => {
  await openGame(page, "Azul");
  await addLink(page).click();
  await toggle(page, "Theme").click();
  await box(page).fill("   ");
  await save(page).click();

  await expect(
    section(page).getByText("Write something before you save."),
  ).toBeVisible();
  await expect(box(page)).toHaveAttribute("aria-invalid", "true");
  await expect(box(page)).toBeFocused();
  await expect(box(page)).toHaveAccessibleDescription(
    "Write something before you save.",
  );
  // Typing takes the message away.
  await box(page).fill("Nice");
  await expect(
    section(page).getByText("Write something before you save."),
  ).toHaveCount(0);
  await expect(rows(page)).toHaveCount(0);
});

test("a counter shows near the 10,000 limit, and an over-long thought is refused", async ({
  page,
}) => {
  await openGame(page, "Heat");
  await addLink(page).click();
  // The hint is shown until the last 500 characters.
  await expect(section(page).getByText(/Light Markdown works/)).toBeVisible();
  await box(page).fill("x".repeat(9_600));
  await expect(section(page).getByText("400 characters left")).toBeVisible();
  await expect(section(page).getByText(/Light Markdown works/)).toHaveCount(0);

  await box(page).fill("x".repeat(10_010));
  await expect(section(page).getByText("10 characters too many")).toBeVisible();
  await save(page).click();
  await expect(
    section(page).getByText(
      "This thought is too long. Keep it to 10,000 characters.",
    ),
  ).toBeVisible();
  await expect(box(page)).toBeFocused();
  await expect(rows(page)).toHaveCount(0);

  // Exactly at the limit saves.
  await box(page).fill("y".repeat(10_000));
  await save(page).click();
  await expect(rows(page)).toHaveCount(1);
});

test("Ctrl+Enter saves, and Escape cancels", async ({ page }) => {
  await openGame(page, "Brass");
  await addLink(page).click();
  await box(page).fill("Saved with the keyboard.");
  await box(page).press("Control+Enter");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Saved with the keyboard.");

  // Escape with nothing typed closes without a message and returns to the link.
  await addLink(page).click();
  await box(page).press("Escape");
  await expect(box(page)).toHaveCount(0);
  await expect(addLink(page)).toBeFocused();
  await expect(section(page).getByText("Draft discarded.")).toHaveCount(0);
});

test("cancel with text discards the draft, and Undo brings it back", async ({
  page,
}) => {
  await openGame(page, "Catan");
  await addLink(page).click();
  await box(page).fill("A half-written thought");
  await toggle(page, "Theme").click();
  await section(page).getByRole("button", { name: "Cancel" }).click();

  await expect(box(page)).toHaveCount(0);
  await expect(
    section(page).getByText("Draft discarded.").first(),
  ).toBeVisible();
  const undo = section(page).getByRole("button", { name: "Undo" });
  await expect(undo).toBeFocused();

  await undo.click();
  await expect(box(page)).toHaveValue("A half-written thought");
  await expect(toggle(page, "Theme")).toHaveAttribute("aria-pressed", "true");
  await expect(section(page).getByText("Draft discarded.")).toHaveCount(0);
});

test("an unsaved draft comes back after a reload, and can be discarded", async ({
  page,
}) => {
  await openGame(page, "Carcassonne");
  await addLink(page).click();
  await box(page).fill("Not saved yet");
  await toggle(page, "Combat").click();
  // The draft is written about half a second after the last change.
  await page.waitForTimeout(900);

  await page.reload();
  await expect(box(page)).toHaveValue("Not saved yet");
  await expect(toggle(page, "Combat")).toHaveAttribute("aria-pressed", "true");
  await expect(
    section(page).getByText("Restored your unsaved draft."),
  ).toBeVisible();
  // Focus is not moved on load.
  await expect(box(page)).not.toBeFocused();

  await section(page).getByRole("button", { name: "Discard draft" }).click();
  await expect(box(page)).toHaveCount(0);
  await expect(
    section(page).getByText("Draft discarded.").first(),
  ).toBeVisible();
  await page.reload();
  await expect(box(page)).toHaveCount(0);
});

test("topic tabs filter the list, and a selected topic starts pressed in a new thought", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Wingspan");
  await seed(page, gameId, testInfo, [
    {
      body: "About art and play",
      topics: ["artwork", "mechanics"],
      written_on: "2026-10-03",
    },
    { body: "About art only", topics: ["artwork"], written_on: "2026-10-02" },
    { body: "About theme", topics: ["theme"], written_on: "2026-10-01" },
    { body: "No topic", topics: [], written_on: "2026-09-30" },
  ]);

  const tabs = section(page).getByRole("group", {
    name: "Show thoughts about",
  });
  await expect(tabs.getByRole("button")).toHaveText([
    "All4",
    "Mechanics1",
    "Theme1",
    "Artwork2",
  ]);
  await expect(rows(page)).toHaveCount(4);
  // Newest first.
  await expect(rows(page).first()).toContainText("About art and play");
  await expect(rows(page).first()).toContainText("artwork · mechanics");

  await tabs.getByRole("button", { name: "Artwork, 2 thoughts" }).click();
  await expect(rows(page)).toHaveCount(2);
  await expect(
    tabs.getByRole("button", { name: "Artwork, 2 thoughts" }),
  ).toHaveAttribute("aria-pressed", "true");
  // Only the other topics, as "also".
  await expect(rows(page).first()).toContainText("also: mechanics");
  await expect(rows(page).nth(1)).not.toContainText("also");

  // A new thought opened while Artwork is selected starts with Artwork pressed.
  await addLink(page).click();
  await expect(toggle(page, "Artwork")).toHaveAttribute("aria-pressed", "true");
  await toggle(page, "Artwork").click();
  await expect(toggle(page, "Artwork")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await box(page).fill("Written without the topic");
  await toggle(page, "Combat").click();
  await save(page).click();
  // It is not about artwork, so the filter switches to All to show it.
  await expect(
    tabs.getByRole("button", { name: "All, 5 thoughts" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(rows(page).first()).toContainText("Written without the topic");
  expect(await overflow(page)).toBe(0);
});

test("a selected topic that becomes empty stays as 0 with a way back", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Heat");
  await seed(page, gameId, testInfo, [
    { body: "Only theme thought", topics: ["theme"], written_on: "2026-10-01" },
    { body: "Other", topics: ["combat"], written_on: "2026-09-01" },
  ]);
  await section(page).getByRole("button", { name: "Theme, 1 thought" }).click();
  await rows(page)
    .first()
    .getByRole("button", { name: /^Actions for/ })
    .click();
  await rows(page)
    .first()
    .getByRole("button", { name: /^Delete thought from/ })
    .click();
  await section(page).getByRole("button", { name: "Delete thought" }).click();

  await expect(
    section(page).getByText("No thoughts about theme."),
  ).toBeVisible();
  await expect(
    section(page).getByRole("button", { name: "Theme, 0 thoughts" }),
  ).toHaveAttribute("aria-pressed", "true");
  await section(page)
    .getByRole("button", { name: "Show all thoughts" })
    .click();
  await expect(rows(page)).toHaveCount(1);
  await expect(
    section(page).getByRole("button", { name: "Theme, 0 thoughts" }),
  ).toHaveCount(0);
  await expect(
    section(page).getByRole("button", { name: "All, 1 thought" }),
  ).toBeFocused();
});

test("the ··· menu opens, closes with Escape, an outside press and Tab, and has Edit and Delete", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Azul");
  await seed(page, gameId, testInfo, [
    { body: "First", written_on: "2026-11-02" },
    { body: "Second", written_on: "2026-11-01" },
  ]);
  const first = rows(page).first();
  const dots = first.getByRole("button", {
    name: "Actions for the thought from 2 November 2026",
  });
  const edit = first.getByRole("button", {
    name: "Edit thought from 2 November 2026",
  });
  const del = first.getByRole("button", {
    name: "Delete thought from 2 November 2026",
  });

  await expect(edit).toBeHidden();
  await dots.click();
  await expect(dots).toHaveAttribute("aria-expanded", "true");
  await expect(edit).toBeVisible();
  await expect(del).toBeVisible();

  // Escape closes it and focus stays on the button.
  await dots.press("Escape");
  await expect(edit).toBeHidden();
  await expect(dots).toBeFocused();

  // An outside press closes it.
  await dots.click();
  await expect(edit).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(edit).toBeHidden();

  // Only one menu is open at a time. An open menu covers the row below it, so open the lower
  // one first and then the upper one.
  const secondDots = rows(page).nth(1).getByRole("button", {
    name: "Actions for the thought from 1 November 2026",
  });
  const secondEdit = rows(page).nth(1).getByRole("button", {
    name: "Edit thought from 1 November 2026",
  });
  await secondDots.click();
  await expect(secondEdit).toBeVisible();
  // The lower menu may open upward over this button, so use the keyboard.
  await dots.focus();
  await page.keyboard.press("Enter");
  await expect(secondEdit).toBeHidden();
  await expect(edit).toBeVisible();
  await dots.press("Escape");

  // Tab goes to Edit, then Delete, and past Delete closes the menu.
  await dots.click();
  await dots.focus();
  await page.keyboard.press("Tab");
  await expect(edit).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(del).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(edit).toBeHidden();
});

test("the menu opens upward when there is no room below", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Brass");
  await seed(
    page,
    gameId,
    testInfo,
    Array.from({ length: 6 }, (_, index) => ({
      body: `Thought ${index + 1}`,
      written_on: `2026-10-${String(20 - index).padStart(2, "0")}`,
    })),
  );
  const dots = rows(page)
    .nth(2)
    .getByRole("button", { name: /^Actions for/ });
  // Room to scroll, so the button can be put at the very bottom of the screen.
  await page.evaluate(() => {
    document.body.style.paddingBottom = "2000px";
  });
  await dots.evaluate((element) => {
    const bottom = element.getBoundingClientRect().bottom;
    window.scrollBy(0, bottom - (window.innerHeight - 90));
  });
  await dots.click();
  const panel = rows(page)
    .nth(2)
    .getByRole("group", { name: /^Actions for/ });
  await expect(panel).toBeVisible();
  const [buttonBox, panelBox] = await Promise.all([
    dots.boundingBox(),
    panel.boundingBox(),
  ]);
  // The panel is above the button, and still inside the screen.
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(buttonBox!.y + 1);
  expect(panelBox!.y).toBeGreaterThanOrEqual(0);
});

test("edit from the menu: change text and topics, the date stays, nothing says edited", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Wingspan");
  await seed(page, gameId, testInfo, [
    { body: "Original text", topics: ["theme"], written_on: "2026-10-05" },
    { body: "Another", topics: [], written_on: "2026-10-01" },
  ]);
  const first = rows(page).first();
  await first.getByRole("button", { name: /^Actions for/ }).click();
  await first.getByRole("button", { name: /^Edit thought from/ }).click();

  const editBox = page.getByRole("textbox", {
    name: "Edit thought from 5 October 2026",
  });
  await expect(editBox).toHaveValue("Original text");
  await expect(editBox).toBeFocused();
  await expect(toggle(page, "Theme")).toHaveAttribute("aria-pressed", "true");
  // The edit footer has Cancel and Save changes, and no Delete.
  await expect(
    section(page).getByRole("button", { name: "Save changes" }),
  ).toBeVisible();
  await expect(
    section(page).getByRole("button", { name: "Delete", exact: true }),
  ).toHaveCount(0);

  await editBox.fill("Changed text");
  await toggle(page, "Theme").click();
  await toggle(page, "Combat").click();
  await section(page).getByRole("button", { name: "Save changes" }).click();

  await expect(editBox).toHaveCount(0);
  await expect(rows(page).first()).toContainText("Changed text");
  await expect(rows(page).first()).toContainText("combat");
  await expect(rows(page).first()).not.toContainText("theme");
  await expect(rows(page).first().locator("time")).toHaveAttribute(
    "datetime",
    "2026-10-05",
  );
  await expect(rows(page).first()).not.toContainText(/edited/i);
  await expect(rows(page).first()).toBeFocused();
  await expect(status(page)).toHaveText("Changes saved.");
  // Still first: editing does not move a row.
  await expect(rows(page).nth(1)).toContainText("Another");
});

test("cancelling an edit returns focus to the ··· button, and unsaved changes are restored", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Catan");
  await seed(page, gameId, testInfo, [
    { body: "Saved text", written_on: "2026-10-05" },
  ]);
  const row = rows(page).first();
  const dots = row.getByRole("button", { name: /^Actions for/ });
  await dots.click();
  await row.getByRole("button", { name: /^Edit thought from/ }).click();
  const editBox = page.getByRole("textbox", { name: /^Edit thought from/ });
  await editBox.fill("Saved text with changes");
  await page.waitForTimeout(900);

  // Open another composer: the edit closes and keeps its changes as a draft.
  await addLink(page).click();
  await expect(editBox).toHaveCount(0);
  await section(page).getByRole("button", { name: "Cancel" }).click();

  await dots.click();
  await row.getByRole("button", { name: /^Edit thought from/ }).click();
  await expect(
    section(page).getByText("Restored your unsaved changes."),
  ).toBeVisible();
  await expect(editBox).toHaveValue("Saved text with changes");

  // Discard changes puts the saved text back and keeps editing.
  await section(page).getByRole("button", { name: "Discard changes" }).click();
  await expect(editBox).toHaveValue("Saved text");
  await expect(editBox).toBeFocused();

  await editBox.press("Escape");
  await expect(editBox).toHaveCount(0);
  await expect(dots).toBeFocused();
});

test("delete asks first, says what is lost, and moves focus to the next thought", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Heat");
  await seed(page, gameId, testInfo, [
    { body: "First", written_on: "2026-11-03" },
    { body: "Second", written_on: "2026-11-02" },
    { body: "Third", written_on: "2026-11-01" },
  ]);
  const second = rows(page).nth(1);
  await second.getByRole("button", { name: /^Actions for/ }).click();
  await second.getByRole("button", { name: /^Delete thought from/ }).click();

  const confirm = second.getByRole("group", { name: /^Delete thought from/ });
  await expect(confirm).toContainText(
    "Delete this thought? Its text and topics are removed for good. This cannot be undone.",
  );
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  // The ··· button is hidden while the confirm is open.
  await expect(
    second.getByRole("button", { name: /^Actions for/ }),
  ).toHaveCount(0);

  // Escape cancels and returns to the ··· button.
  await page.keyboard.press("Escape");
  await expect(confirm).toHaveCount(0);
  await expect(
    second.getByRole("button", { name: /^Actions for/ }),
  ).toBeFocused();

  await second.getByRole("button", { name: /^Actions for/ }).click();
  await second.getByRole("button", { name: /^Delete thought from/ }).click();
  await confirm.getByRole("button", { name: "Delete thought" }).click();

  await expect(rows(page)).toHaveCount(2);
  await expect(section(page)).not.toContainText("Second");
  await expect(status(page)).toHaveText("Thought deleted.");
  await expect(rows(page).nth(1)).toBeFocused();
  await expect(rows(page).nth(1)).toContainText("Third");

  // Gone for good.
  await page.reload();
  await expect(rows(page)).toHaveCount(2);
});

test("Show more adds ten at a time and moves focus to the first new row", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Brass");
  const many = Array.from({ length: 25 }, (_, index) => ({
    body: `Thought number ${index + 1}`,
    written_on: `2026-10-${String(25 - index).padStart(2, "0")}`,
  }));
  await seed(page, gameId, testInfo, many);

  await expect(rows(page)).toHaveCount(10);
  await expect(section(page).getByText("10 of 25 shown")).toBeVisible();
  await section(page).getByRole("button", { name: "Show 10 more" }).click();
  await expect(rows(page)).toHaveCount(20);
  await expect(rows(page).nth(10)).toBeFocused();
  await expect(rows(page).nth(10)).toContainText("Thought number 11");
  await section(page).getByRole("button", { name: "Show 5 more" }).click();
  await expect(rows(page)).toHaveCount(25);
  await expect(
    section(page).getByRole("button", { name: /^Show \d+ more$/ }),
  ).toHaveCount(0);
  await expect(section(page).getByText(/shown/)).toHaveCount(0);
});

test("light Markdown is shown, and markup is never executed", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Azul");
  await seed(page, gameId, testInfo, [
    {
      body: "A **bold** and *italic* word.\nSecond line.\n\n- one\n- two\n\nSee [the rules](https://example.com/rules) and <script>window.__hacked = 1</script> and [bad](javascript:alert(1)).",
      written_on: "2026-10-01",
    },
  ]);
  const row = rows(page).first();
  await expect(row.locator("strong")).toHaveText("bold");
  await expect(row.locator("em")).toHaveText("italic");
  await expect(row.locator("li")).toHaveText(["one", "two"]);
  const link = row.getByRole("link", { name: "the rules" });
  await expect(link).toHaveAttribute("href", "https://example.com/rules");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(row).toContainText("<script>window.__hacked = 1</script>");
  await expect(row.getByRole("link", { name: "bad" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { __hacked?: number }).__hacked,
    ),
  ).toBeUndefined();
});

test("a long thought is cut with Show all, which opens and closes it", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Catan");
  const long = Array.from(
    { length: 12 },
    (_, index) => `Line ${index + 1} of a long thought.`,
  ).join("\n\n");
  await seed(page, gameId, testInfo, [
    { body: long, topics: ["theme"], written_on: "2026-10-01" },
  ]);
  const row = rows(page).first();
  const showAll = row.getByRole("button", { name: "Show all" });
  await expect(showAll).toBeVisible();
  await expect(showAll).toHaveAttribute("aria-expanded", "false");
  await expect(row).toContainText("theme");
  await showAll.click();
  const showLess = row.getByRole("button", { name: "Show less" });
  await expect(showLess).toBeFocused();
  await expect(showLess).toHaveAttribute("aria-expanded", "true");
  await expect(row).toContainText("Line 12 of a long thought.");
  await showLess.click();
  await expect(row.getByRole("button", { name: "Show all" })).toBeVisible();
  expect(await overflow(page)).toBe(0);
});

test("all nine topics wrap onto lines and nothing scrolls sideways", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Heat");
  const topics = [
    "mechanics",
    "theme",
    "artwork",
    "components",
    "production",
    "replayability",
    "solo_mode",
    "interaction",
    "combat",
  ];
  await seed(
    page,
    gameId,
    testInfo,
    topics.map((topic, index) => ({
      body: `About ${topic}`,
      topics: [topic],
      written_on: `2026-10-0${index + 1}`,
    })),
  );
  const tabs = section(page).getByRole("group", {
    name: "Show thoughts about",
  });
  await expect(tabs.getByRole("button")).toHaveCount(10);
  const first = await tabs.getByRole("button").first().boundingBox();
  const last = await tabs.getByRole("button").last().boundingBox();
  const narrow = testInfo.project.name === "mobile";
  if (narrow) expect(last!.y).toBeGreaterThan(first!.y + 40);
  expect(await overflow(page)).toBe(0);
  for (const box of await tabs.getByRole("button").all()) {
    const size = await box.boundingBox();
    expect(size!.height).toBeGreaterThanOrEqual(43);
    expect(size!.width).toBeGreaterThanOrEqual(43);
  }
});

test("another account does not see my thoughts, and a failed save keeps the text", async ({
  page,
  context,
}, testInfo) => {
  const gameId = await openGame(page, "Brass");
  await seed(page, gameId, testInfo, [
    { body: "Private thought", written_on: "2026-10-01" },
  ]);
  await expect(rows(page)).toHaveCount(1);

  // A failed save keeps text, topics and focus on Save.
  await context.route("**/games/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.abort("failed");
    } else {
      await route.continue();
    }
  });
  await addLink(page).click();
  await box(page).fill("Will not save");
  await toggle(page, "Theme").click();
  await save(page).click();
  await expect(
    section(page).getByText(
      "Could not save your thought. It is still here and on this device. Try again.",
    ),
  ).toBeVisible();
  await expect(box(page)).toHaveValue("Will not save");
  await expect(toggle(page, "Theme")).toHaveAttribute("aria-pressed", "true");
  await expect(save(page)).toBeEnabled();
});

test("a pressed topic you never touched is not kept as a draft", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Heat");
  await seed(page, gameId, testInfo, [
    { body: "About theme", topics: ["theme"], written_on: "2026-10-01" },
  ]);
  await section(page).getByRole("button", { name: "Theme, 1 thought" }).click();
  await addLink(page).click();
  await expect(toggle(page, "Theme")).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(900);
  await page.reload();
  // No text and only the topic that was pressed for you: nothing to restore.
  await expect(box(page)).toHaveCount(0);
  await expect(section(page).getByText(/Restored your unsaved/)).toHaveCount(0);
});

test("a failed edit save keeps the changes and a failed delete keeps the confirm open", async ({
  page,
  context,
}, testInfo) => {
  const gameId = await openGame(page, "Catan");
  await seed(page, gameId, testInfo, [
    { body: "Original", written_on: "2026-10-05" },
  ]);
  await context.route("**/games/**", async (route) => {
    if (route.request().method() === "POST") await route.abort("failed");
    else await route.continue();
  });
  const row = rows(page).first();

  // Edit: the server cannot be reached.
  await row.getByRole("button", { name: /^Actions for/ }).click();
  await row.getByRole("button", { name: /^Edit thought from/ }).click();
  const editBox = page.getByRole("textbox", { name: /^Edit thought from/ });
  await editBox.fill("Changed but not saved");
  await section(page).getByRole("button", { name: "Save changes" }).click();
  await expect(
    section(page).getByText(
      "Could not save your changes. They are still here and on this device. Try again.",
    ),
  ).toBeVisible();
  await expect(editBox).toHaveValue("Changed but not saved");
  await expect(
    section(page).getByRole("button", { name: "Save changes" }),
  ).toBeFocused();
  await section(page).getByRole("button", { name: "Cancel" }).click();

  // Delete: the confirm stays with the message, and Delete thought keeps focus.
  await row.getByRole("button", { name: /^Actions for/ }).click();
  await row.getByRole("button", { name: /^Delete thought from/ }).click();
  await row.getByRole("button", { name: "Delete thought" }).click();
  await expect(
    row.getByText("Could not delete this thought. Try again."),
  ).toBeVisible();
  await expect(
    row.getByRole("button", { name: "Delete thought" }),
  ).toBeFocused();
  await expect(rows(page)).toHaveCount(1);
});

test("_italics_ in the hint really works", async ({ page }) => {
  await openGame(page, "Heat");
  await addLink(page).click();
  await box(page).fill("It is _quite_ good and has *real* depth.");
  await save(page).click();
  await expect(rows(page).first().locator("em")).toHaveText(["quite", "real"]);
});

// Last on purpose: signing out ends this account's session for the tests that follow.
test("signing out clears unsaved thought drafts from the browser", async ({
  page,
}) => {
  await openGame(page, "Azul");
  await addLink(page).click();
  await box(page).fill("Private half-written thought");
  await page.waitForTimeout(900);
  const keys = () =>
    page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) =>
        key.startsWith("draft:thought:"),
      ),
    );
  expect((await keys()).length).toBe(1);

  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(await keys()).toEqual([]);
});
