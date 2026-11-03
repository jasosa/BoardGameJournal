import { expect, test } from "@playwright/test";
import {
  createAccount,
  deleteAccount,
  resetLibrary,
} from "../support/accounts";
import { accountFor } from "./accounts";
import { addGame } from "./helpers";

// Tests in this file share one account per project, so they run one after another.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({}, testInfo) => {
  await resetLibrary(accountFor(testInfo.project.name).id);
});

test("a new account sees the empty library with a way to add a game", async ({
  page,
}) => {
  await page.goto("/library");
  await expect(page.getByText("No games yet")).toBeVisible();
  await page.getByRole("link", { name: "Add a game" }).click();
  await expect(page).toHaveURL(/\/capture$/);
});

test("Back returns to the page I came from", async ({ page }) => {
  await page.goto("/settings");
  await page
    .getByRole("link", { name: /Add game/ })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/capture$/);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("Back falls back to the Library when there is no history", async ({
  page,
}) => {
  await page.goto("/capture");
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/library$/);
});

test("games added by hand show in the gallery with their status", async ({
  page,
}) => {
  await addGame(page, "Wingspan");
  await addGame(page, "  Cascadia ", "Wishlist");

  const gallery = page.getByRole("list", { name: "Your games" });
  const cards = gallery.getByRole("listitem");
  await expect(cards).toHaveCount(2);
  // Newest first.
  await expect(cards.nth(0)).toContainText("Cascadia");
  await expect(cards.nth(0)).toContainText("Wishlist");
  await expect(cards.nth(1)).toContainText("Wingspan");
  // Owned is the default and is not repeated on the card.
  await expect(cards.nth(1)).not.toContainText("Owned");

  await page.reload();
  await expect(cards).toHaveCount(2);
});

test("a blank title shows an error and keeps the form", async ({ page }) => {
  await page.goto("/capture");
  await page.getByLabel("Wishlist", { exact: true }).check();
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText("Enter a title.");
  await expect(page).toHaveURL(/\/capture$/);
  await expect(page.getByLabel("Wishlist", { exact: true })).toBeChecked();
  // The message is tied to the Title field for screen readers.
  const title = page.getByLabel("Title");
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveAccessibleDescription("Enter a title.");
});

test("another account does not see my games", async ({
  page,
  browser,
  baseURL,
}) => {
  await addGame(page, "Private to me");

  const other = await createAccount("other");
  try {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const otherPage = await context.newPage();
    await otherPage.goto(`${baseURL}/login`);
    await otherPage.getByLabel("Email").fill(other.email);
    await otherPage.getByLabel("Password").fill(other.password);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await otherPage.waitForURL(`${baseURL}/`);
    await otherPage.goto(`${baseURL}/library`);
    await expect(otherPage.getByText("No games yet")).toBeVisible();
    await expect(otherPage.getByText("Private to me")).toHaveCount(0);
    await context.close();
  } finally {
    await deleteAccount(other.id);
  }
});

test("a title I already have shows a notice and saves nothing yet", async ({
  page,
}) => {
  await addGame(page, "Wingspan");

  await page.goto("/capture");
  await page.getByLabel("Title").fill("  wingspan! ");
  await page.getByRole("button", { name: "Save game" }).click();

  const notice = page.getByRole("status").filter({ hasText: "already have" });
  await expect(notice).toContainText("You already have Wingspan (Owned).");
  await expect(page).toHaveURL(/\/capture$/);
  // What was typed stays, and Save game is replaced by the two choices.
  await expect(page.getByLabel("Title")).toHaveValue("  wingspan! ");
  await expect(page.getByRole("button", { name: "Save game" })).toHaveCount(0);

  // Nothing was saved: still one card.
  await page.goto("/library");
  await expect(
    page.getByRole("list", { name: "Your games" }).getByRole("listitem"),
  ).toHaveCount(1);
});

test("Add another copy puts a second copy on the same game", async ({
  page,
}) => {
  await addGame(page, "Wingspan");

  await page.goto("/capture");
  await page.getByLabel("Title").fill("WINGSPAN");
  await page.getByLabel("Wishlist", { exact: true }).check();
  await page.getByRole("button", { name: "Save game" }).click();
  await page.getByRole("button", { name: "Add another copy" }).click();

  await expect(page).toHaveURL(/\/games\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Wingspan" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Status of copy 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Status of copy 2" }),
  ).toBeVisible();

  // The Library shows one card per copy, and both open the same game.
  await page.goto("/library");
  const links = page
    .getByRole("list", { name: "Your games" })
    .getByRole("link", { name: /Wingspan/ });
  await expect(links).toHaveCount(2);
  const hrefs = await links.evaluateAll((els) =>
    els.map((el) => el.getAttribute("href")),
  );
  expect(hrefs[0]).toBe(hrefs[1]);
});

test("the notice can open the existing game, and a new title brings Save back", async ({
  page,
}) => {
  await addGame(page, "Wingspan");

  await page.goto("/capture");
  await page.getByLabel("Title").fill("Wingspan");
  await page.getByRole("button", { name: "Save game" }).click();
  await page.getByRole("link", { name: "Open Wingspan" }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Wingspan" })).toBeVisible();

  // Typing a different title takes the notice away and a different game can be saved.
  await page.goto("/capture");
  await page.getByLabel("Title").fill("Wingspan");
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(
    page.getByRole("button", { name: "Add another copy" }),
  ).toBeVisible();
  await page.getByLabel("Title").fill("Wingspan Asia");
  await expect(
    page.getByRole("button", { name: "Add another copy" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByRole("list", { name: "Your games" }).getByRole("listitem"),
  ).toHaveCount(2);
});

test("the notice fits the screen and its actions are reachable by keyboard", async ({
  page,
}) => {
  await addGame(page, "Wingspan");
  await page.goto("/capture");
  await page.getByLabel("Title").fill("Wingspan");
  await page.getByRole("button", { name: "Save game" }).click();
  const open = page.getByRole("link", { name: "Open Wingspan" });
  await open.focus();
  await expect(open).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Add another copy" }),
  ).toBeFocused();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
