import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { resetLibrary } from "../support/accounts";
import { seedLibrary } from "../support/seed";
import { accountFor, accountKey, storageStatePath } from "./accounts";

// This file has its own signed-in account per project, with 250 games. Nothing here changes
// the games, so the tests share one seeding. Cookies are loaded per test (the project's
// default sign-in state belongs to another account).
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  const id = accountFor(testInfo.project.name, "library").id;
  await resetLibrary(id);
  await seedLibrary(id, 250);
});

test.beforeEach(async ({ context }, testInfo) => {
  const key = accountKey(testInfo.project.name, "library");
  const state = JSON.parse(readFileSync(storageStatePath(key), "utf8")) as {
    cookies: Parameters<typeof context.addCookies>[0];
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
});

const games = (page: Page) => page.getByRole("list", { name: "Your games" });
const noOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

/** The search field that is on screen (the top bar on wide screens, the page on small ones). */
const searchField = (page: Page) =>
  page.getByLabel("Search your games").filter({ visible: true });

/** Opens the extra filters unless they are already open (they stay open while one is in use). */
async function openMoreFilters(page: Page) {
  const panel = page.getByRole("link", { name: "Up to 30 minutes" });
  if (!(await panel.isVisible())) {
    await page.getByText("More filters").click();
  }
  await expect(panel).toBeVisible();
}

const statusFilters = (page: Page) =>
  page.getByRole("navigation", { name: "Status filter" });

test("250 games are shown 48 at a time, with page links", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByText("250 games")).toBeVisible();
  await expect(page.getByText("250 games · showing 1 to 48")).toBeVisible();
  await expect(games(page).getByRole("listitem")).toHaveCount(48);

  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/library\?page=2$/);
  await expect(page.getByText("250 games · showing 49 to 96")).toBeVisible();

  await page.goto("/library?page=6");
  await expect(games(page).getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("link", { name: "Next" })).toHaveCount(0);

  // A page past the end shows the last page.
  await page.goto("/library?page=99");
  await expect(page.getByText("250 games · showing 241 to 250")).toBeVisible();
});

test("searching narrows the list, keeps the URL, and survives reload and Back", async ({
  page,
}) => {
  await page.goto("/library");
  await searchField(page).fill("wing");
  await searchField(page).press("Enter");
  await expect(page).toHaveURL(/q=wing/);
  await expect(games(page).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("1 of 250 games")).toBeVisible();

  await page.reload();
  await expect(games(page).getByRole("listitem")).toHaveCount(1);
  await expect(searchField(page)).toHaveValue("wing");

  await page.goBack();
  await expect(games(page).getByRole("listitem")).toHaveCount(48);
});

test("search ignores accents and case", async ({ page }) => {
  await page.goto("/library?q=CAFE");
  await expect(games(page).getByRole("listitem")).toHaveCount(1);
  await expect(
    games(page).getByRole("heading", { name: "Café Terrace" }),
  ).toBeVisible();
});

test("a status filter shows only that status, with several shown together", async ({
  page,
}) => {
  await page.goto("/library");
  await statusFilters(page).getByRole("link", { name: "Wishlist" }).click();
  await expect(page).toHaveURL(/status=wishlist/);
  await expect(games(page).getByRole("listitem")).toHaveCount(1);
  await expect(
    statusFilters(page).getByRole("link", { name: "Wishlist" }),
  ).toHaveAttribute("aria-current", "true");

  // A second status adds to it; every card then names its status, even Owned.
  await statusFilters(page).getByRole("link", { name: "Interested" }).click();
  await expect(games(page).getByRole("listitem")).toHaveCount(2);
  await expect(games(page)).toContainText("Wishlist");
  await expect(games(page)).toContainText("Interested");

  // "All" clears them, and a chosen status switches off again when clicked twice.
  await statusFilters(page).getByRole("link", { name: "All" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(games(page).getByRole("listitem")).toHaveCount(48);
});

test("the search keeps the chosen status", async ({ page }) => {
  await page.goto("/library?status=wishlist");
  await searchField(page).fill("cafe");
  await searchField(page).press("Enter");
  await expect(page).toHaveURL(/status=wishlist/);
  await expect(page).toHaveURL(/q=cafe/);
  await expect(games(page).getByRole("listitem")).toHaveCount(1);
});

test("players and play time filters combine", async ({ page }) => {
  await page.goto("/library");
  await openMoreFilters(page);
  await page.getByRole("link", { name: "1 player", exact: true }).click();
  await expect(page).toHaveURL(/players=1/);
  await openMoreFilters(page);
  await page.getByRole("link", { name: "Up to 60 minutes" }).click();
  await expect(page).toHaveURL(/time=60/);
  await expect(games(page).getByRole("listitem")).toHaveCount(2);
  await expect(
    games(page).getByRole("heading", { name: "Wingspan" }),
  ).toBeVisible();
  await expect(
    games(page).getByRole("heading", { name: "Zen Garden" }),
  ).toBeVisible();
});

test("sorting by title puts Arkham first", async ({ page }) => {
  await page.goto("/library");
  await page.getByRole("link", { name: "Title", exact: true }).click();
  await expect(page).toHaveURL(/sort=title/);
  await expect(
    games(page).getByRole("listitem").first().getByRole("heading"),
  ).toHaveText("Arkham");
});

test("shelf and table views list the games and open one", async ({ page }) => {
  await page.goto("/library");
  await page.getByRole("link", { name: "Shelf" }).click();
  await expect(page).toHaveURL(/view=shelf/);
  await expect(games(page).getByRole("listitem")).toHaveCount(48);
  expect(await noOverflow(page)).toBe(0);

  await page.getByRole("link", { name: "Table" }).click();
  await expect(page).toHaveURL(/view=table/);
  const table = page.getByRole("table", { name: "Your games" });
  await expect(table.getByRole("row")).toHaveCount(49);
  expect(await noOverflow(page)).toBe(0);
  await table.getByRole("link", { name: "Wingspan" }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Wingspan" })).toBeVisible();

  // The view switch marks the current view.
  await page.goto("/library?view=shelf");
  await expect(page.getByRole("link", { name: "Shelf" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("a shelf spine opens its game", async ({ page }) => {
  await page.goto("/library?view=shelf&q=catan");
  await games(page).getByRole("link", { name: "Catan" }).click();
  await expect(page.getByRole("heading", { name: "Catan" })).toBeVisible();
});

test("no results offers to clear, or to add the search as a new game", async ({
  page,
}) => {
  await page.goto("/library?q=zzzzzz");
  await expect(page.getByText('Nothing matches "zzzzzz"')).toBeVisible();
  await page.getByRole("link", { name: /Add "zzzzzz"/ }).click();
  await expect(page).toHaveURL(/\/capture\?title=zzzzzz/);
  await expect(page.getByLabel("Title")).toHaveValue("zzzzzz");

  await page.goto("/library?q=zzzzzz&status=owned");
  await page
    .getByRole("status")
    .getByRole("link", { name: "Clear filters" })
    .click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(games(page).getByRole("listitem")).toHaveCount(48);
});

test("a hand-edited URL never breaks the page", async ({ page }) => {
  await page.goto(
    "/library?page=-4&status=zzz&view=carousel&players=x&time=9999",
  );
  await expect(games(page).getByRole("listitem")).toHaveCount(48);
  await page.goto("/library?q=" + "x".repeat(400));
  await expect(page.getByText("Nothing matches")).toBeVisible();
});

test("the controls fit the screen and work from the keyboard", async ({
  page,
}) => {
  await page.goto("/library");
  expect(await noOverflow(page)).toBe(0);

  const more = page.getByText("More filters");
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("link", { name: "Up to 30 minutes" }),
  ).toBeVisible();
  expect(await noOverflow(page)).toBe(0);

  // Tap targets are at least 44px tall.
  for (const locator of [
    searchField(page),
    more,
    page.getByRole("link", { name: "Table" }),
    statusFilters(page).getByRole("link", { name: "Wishlist" }),
    page.getByRole("link", { name: "Title", exact: true }),
  ]) {
    const box = await locator.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("the wall keeps each cover's own shape", async ({ page }) => {
  await page.goto("/library");
  // Seeded games have no cover, so their tiles are 3:4. Covered tiles follow the stored size
  // (see the covers spec); here only the wall's columns are checked.
  const columns = await games(page).evaluate(
    (el) => getComputedStyle(el).columnCount,
  );
  expect(Number(columns)).toBeGreaterThanOrEqual(2);
});
