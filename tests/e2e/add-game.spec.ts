import { expect, test, type Page } from "@playwright/test";
import {
  createAccount,
  deleteAccount,
  resetLibrary,
} from "../support/accounts";
import { accountFor } from "./accounts";

// Tests in this file share one account per project, so they run one after another.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({}, testInfo) => {
  await resetLibrary(accountFor(testInfo.project.name).id);
});

async function addGame(page: Page, title: string, status?: string) {
  await page.goto("/capture");
  await page.getByLabel("Title").fill(title);
  if (status) await page.getByLabel(status, { exact: true }).check();
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(page).toHaveURL(/\/library$/);
}

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
    .getByRole("link", { name: /Quick Capture/ })
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
