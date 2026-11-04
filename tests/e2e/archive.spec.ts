import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { resetLibrary } from "../support/accounts";
import { accountFor, accountKey, storageStatePath } from "./accounts";
import { addGame, openManage } from "./helpers";

// Own account per project, so this file can change the library while other specs run.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }, testInfo) => {
  const key = accountKey(testInfo.project.name, "archive");
  const state = JSON.parse(readFileSync(storageStatePath(key), "utf8")) as {
    cookies: Parameters<typeof context.addCookies>[0];
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
  await resetLibrary(accountFor(testInfo.project.name, "archive").id);
});

test("remove a game, find it under Archived, restore it", async ({ page }) => {
  await addGame(page, "Wingspan");
  await page.getByRole("link", { name: /Wingspan/ }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
  const gameUrl = page.url();

  await openManage(page);
  await page.getByRole("button", { name: "Remove from library" }).click();
  await expect(
    page.getByText("Archived. Hidden from your Library"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove from library" }),
  ).toHaveCount(0);

  // Gone from the Library, there under Archived.
  await page.goto("/library");
  await expect(page.getByRole("link", { name: /Wingspan/ })).toHaveCount(0);
  await page.goto("/library?archived=1");
  await expect(page.getByRole("link", { name: /Wingspan/ })).toBeVisible();

  // Restore from the game page.
  await page.goto(gameUrl);
  await page.getByRole("button", { name: "Restore" }).click();
  await openManage(page);
  await expect(
    page.getByRole("button", { name: "Remove from library" }),
  ).toBeVisible();
  await page.goto("/library");
  await expect(page.getByRole("link", { name: /Wingspan/ })).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("delete permanently needs a confirm and then the game is gone", async ({
  page,
}) => {
  await addGame(page, "Azul");
  await page.getByRole("link", { name: /Azul/ }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
  const gameUrl = page.url();

  // Delete is not offered until the copy is archived.
  await expect(
    page.getByRole("button", { name: "Delete permanently" }),
  ).toHaveCount(0);
  await openManage(page);
  await page.getByRole("button", { name: "Remove from library" }).click();

  await page.getByRole("button", { name: "Delete permanently" }).click();
  const confirm = page.getByRole("group", { name: "Confirm permanent delete" });
  await expect(confirm).toContainText("cannot be undone");

  // Cancel keeps it.
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toHaveCount(0);

  await page.getByRole("button", { name: "Delete permanently" }).click();
  await page
    .getByRole("group", { name: "Confirm permanent delete" })
    .getByRole("button", { name: "Delete permanently" })
    .click();

  await expect(page).toHaveURL(/\/library\?archived=1$/);
  await expect(page.getByText("Nothing archived")).toBeVisible();

  await page.goto(gameUrl);
  await expect(page.getByText("We could not find that game")).toBeVisible();
});

test("adding an archived title warns that it is archived", async ({ page }) => {
  await addGame(page, "Catan");
  await page.getByRole("link", { name: /Catan/ }).click();
  await openManage(page);
  await page.getByRole("button", { name: "Remove from library" }).click();
  await expect(
    page.getByText("Archived. Hidden from your Library"),
  ).toBeVisible();

  await page.goto("/capture");
  await page.getByLabel("Title").fill("Catan");
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(page.getByText(/You already have/)).toContainText("archived");
});
