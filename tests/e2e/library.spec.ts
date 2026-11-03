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

async function openFilters(page: Page) {
  await page.getByRole("button", { name: /^Filters/ }).click();
}

test("250 games are shown 48 at a time, with page links", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByText("250 games")).toBeVisible();
  await expect(page.getByText("Showing 1 to 48 of 250")).toBeVisible();
  await expect(games(page).getByRole("listitem")).toHaveCount(48);

  await page.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/library\?page=2$/);
  await expect(page.getByText("Showing 49 to 96 of 250")).toBeVisible();

  await page.goto("/library?page=6");
  await expect(games(page).getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("link", { name: "Next" })).toHaveCount(0);

  // A page past the end shows the last page.
  await page.goto("/library?page=99");
  await expect(page.getByText("Showing 241 to 250 of 250")).toBeVisible();
});

test("searching narrows the list, keeps the URL, and survives reload and Back", async ({
  page,
}) => {
  await page.goto("/library");
  await page.getByLabel("Search your games").fill("wing");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=wing/);
  await expect(games(page).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("1 of 250 games")).toBeVisible();

  await page.reload();
  await expect(games(page).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByLabel("Search your games")).toHaveValue("wing");

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
  await openFilters(page);
  await page.getByLabel("Wishlist", { exact: true }).check();
  await expect(page).toHaveURL(/status=wishlist/);
  await expect(games(page).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByLabel("Wishlist", { exact: true })).toBeChecked();

  // Two statuses: every card names its status, even Owned.
  await page.goto("/library?status=wishlist&status=interested");
  await expect(games(page).getByRole("listitem")).toHaveCount(2);
  await expect(games(page)).toContainText("Wishlist");
  await expect(games(page)).toContainText("Interested");
});

test("players and play time filters combine", async ({ page }) => {
  await page.goto("/library");
  await openFilters(page);
  await page.getByLabel("Players").selectOption("1");
  await page.getByLabel("Play time").selectOption("60");
  await expect(page).toHaveURL(/players=1/);
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
  await openFilters(page);
  await page.getByLabel("Sort").selectOption("title");
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

  const toggle = page.getByRole("button", { name: /^Filters/ });
  await toggle.focus();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Players")).toBeVisible();
  expect(await noOverflow(page)).toBe(0);

  // Tap targets are at least 44px tall.
  for (const locator of [
    page.getByRole("button", { name: "Search" }),
    toggle,
    page.getByLabel("Players"),
    page.getByRole("link", { name: "Table" }),
  ]) {
    const box = await locator.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
