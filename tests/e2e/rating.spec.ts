import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { resetLibrary } from "../support/accounts";
import { accountFor, accountKey, storageStatePath } from "./accounts";
import { addGame } from "./helpers";

// Own account per project, so this file can change the library while other specs run.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }, testInfo) => {
  const key = accountKey(testInfo.project.name, "rating");
  const state = JSON.parse(readFileSync(storageStatePath(key), "utf8")) as {
    cookies: Parameters<typeof context.addCookies>[0];
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
  await resetLibrary(accountFor(testInfo.project.name, "rating").id);
});

async function openGame(page: Page, title: string) {
  await addGame(page, title);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
}

const ratingButton = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name });

test("rate a game from the facts row", async ({ page }) => {
  await openGame(page, "Wingspan");
  const trigger = page.locator("dl button[aria-expanded]");
  await expect(ratingButton(page, "Rate this game")).toHaveText("Rate");

  await ratingButton(page, "Rate this game").click();
  // Opening puts focus in the field.
  const field = page.getByLabel("Rating, 0 to 10");
  await expect(field).toBeFocused();
  await field.fill("8,5");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(trigger).toHaveText("8.5 / 10");
  // Saving closes the popover and says so.
  await expect(field).toBeHidden();
  await expect(page.getByText("Rating saved.")).toBeAttached();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);

  // It survives a reload.
  await page.reload();
  await expect(trigger).toHaveText("8.5 / 10");
});

test("a new rating becomes current and the old one is listed as earlier", async ({
  page,
}) => {
  await openGame(page, "Azul");
  await ratingButton(page, "Rate this game").click();
  await page.getByLabel("Rating, 0 to 10").fill("6");
  await page.getByRole("button", { name: "Save" }).click();
  const trigger = page.locator("dl button[aria-expanded]");
  await expect(trigger).toHaveText("6 / 10");

  await trigger.click();
  // Nothing earlier yet.
  await expect(page.getByText("Earlier")).toBeHidden();
  await page.getByLabel("Rating, 0 to 10").fill("9");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(trigger).toHaveText("9 / 10");

  await trigger.click();
  const earlier = page.getByRole("group", { name: "Rate this game" });
  await expect(earlier.getByText("Earlier")).toBeVisible();
  await expect(earlier.getByRole("listitem")).toHaveCount(1);
  await expect(earlier.getByRole("listitem").first()).toContainText("6");
});

test("a bad rating shows an error on the field, keeps what was typed and keeps focus there", async ({
  page,
}) => {
  await openGame(page, "Heat");
  await ratingButton(page, "Rate this game").click();
  const field = page.getByLabel("Rating, 0 to 10");
  await field.fill("11");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAccessibleDescription(
    /Use a number from 0 to 10, with one decimal at most\./,
  );
  await expect(field).toHaveValue("11");
  await expect(field).toBeFocused();
  await expect(ratingButton(page, "Rate this game")).toHaveText("Rate");
});

test("the popover closes with Escape and returns focus to the number", async ({
  page,
}) => {
  await openGame(page, "Cascadia");
  const trigger = ratingButton(page, "Rate this game");
  await trigger.click();
  await expect(page.getByLabel("Rating, 0 to 10")).toBeVisible();
  // Open, the popover still fits the screen.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Rating, 0 to 10")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the plus and minus buttons step by a half and stop at 0 and 10", async ({
  page,
}) => {
  await openGame(page, "Brass");
  await ratingButton(page, "Rate this game").click();
  const field = page.getByLabel("Rating, 0 to 10");
  // With no rating yet it starts in the middle.
  await expect(field).toHaveValue("5");

  await page.getByRole("button", { name: "Raise the rating" }).click();
  await expect(field).toHaveValue("5.5");
  await page.getByRole("button", { name: "Lower the rating" }).click();
  await page.getByRole("button", { name: "Lower the rating" }).click();
  await expect(field).toHaveValue("4.5");

  await field.fill("10");
  await page.getByRole("button", { name: "Raise the rating" }).click();
  await expect(field).toHaveValue("10");
  await field.fill("0");
  await page.getByRole("button", { name: "Lower the rating" }).click();
  await expect(field).toHaveValue("0");

  // A typed value still steps from where it is, and saves.
  await field.fill("8.7");
  await page.getByRole("button", { name: "Raise the rating" }).click();
  await expect(field).toHaveValue("9");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("dl button[aria-expanded]")).toHaveText("9 / 10");

  // Opening again starts from the current rating.
  await page.locator("dl button[aria-expanded]").click();
  await expect(field).toHaveValue("9");
});
