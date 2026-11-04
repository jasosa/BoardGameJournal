import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  adminClient,
  createAccount,
  deleteAccount,
  resetLibrary,
} from "../support/accounts";
import { accountFor, accountKey, storageStatePath } from "./accounts";
import { addGame, openManage } from "./helpers";

// This file has its own signed-in account per project, so it can change the library
// while the other specs run in parallel. The project's default sign-in state belongs to
// another account, so each test swaps in this account's saved cookies first.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }, testInfo) => {
  const key = accountKey(testInfo.project.name, "game");
  const state = JSON.parse(readFileSync(storageStatePath(key), "utf8")) as {
    cookies: Parameters<typeof context.addCookies>[0];
  };
  await context.clearCookies();
  await context.addCookies(state.cookies);
  await resetLibrary(accountFor(testInfo.project.name, "game").id);
});

/** Adds a game and opens it from the Library. Returns its id. */
async function openGame(
  page: import("@playwright/test").Page,
  title: string,
  status?: string,
) {
  await addGame(page, title, status);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

const FACTS = {
  Year: "2019",
  "Minimum players": "1",
  "Maximum players": "5",
  "Play time (minutes)": "60",
};

test("a game opens from the Library and shows its title, status and details", async ({
  page,
}) => {
  await openGame(page, "Wingspan");
  await expect(
    page.getByRole("heading", { level: 1, name: "Wingspan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Owned", pressed: true, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Manual entry")).toBeVisible();
  await openManage(page);
  await expect(page.getByRole("link", { name: "Add facts" })).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);

  await page.getByRole("link", { name: "Library" }).first().click();
  await expect(page).toHaveURL(/\/library$/);
});

test("changing the status shows on the page and in the Library", async ({
  page,
}) => {
  await openGame(page, "Cascadia");
  await page.getByRole("button", { name: "Wishlist" }).click();
  await expect(
    page.getByRole("button", { name: "Wishlist", pressed: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Owned", pressed: false, exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Wishlist", pressed: true }),
  ).toBeVisible();

  await page.goto("/library");
  const card = page.getByRole("link", { name: /Cascadia/ });
  await expect(card).toContainText("Wishlist");
});

test("facts can be added, shown, and changed again", async ({ page }) => {
  await openGame(page, "Wingspan");
  await openManage(page);
  await page.getByRole("link", { name: "Add facts" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit facts" }),
  ).toBeVisible();
  for (const [label, value] of Object.entries(FACTS)) {
    await page.getByLabel(label).fill(value);
  }
  await page.getByLabel("Description").fill("Engine building with birds.");
  await page.getByRole("button", { name: "Save facts" }).click();

  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
  const facts = page.locator("dl").filter({ hasText: "Players" });
  await expect(facts.getByText("1-5 players")).toBeVisible();
  await expect(facts.getByText("60 min")).toBeVisible();
  await expect(facts.getByText("2019")).toBeVisible();
  await expect(page.getByText("Engine building with birds.")).toBeVisible();

  await openManage(page);
  await page.getByRole("link", { name: "Edit facts" }).click();
  await expect(page.getByLabel("Year")).toHaveValue("2019");
  await page.getByLabel("Year").fill("");
  await page.getByRole("button", { name: "Save facts" }).click();
  await expect(facts.getByText("60 min")).toBeVisible();
  await expect(facts.getByText("2019")).toHaveCount(0);
});

test("bad facts show an error on the field and keep what was typed", async ({
  page,
}) => {
  await openGame(page, "Wingspan");
  await openManage(page);
  await page.getByRole("link", { name: "Add facts" }).click();
  await page.getByLabel("Minimum players").fill("4");
  await page.getByLabel("Maximum players").fill("2");
  await page.getByLabel("Description").fill("Kept text");
  await page.getByRole("button", { name: "Save facts" }).click();

  const max = page.getByLabel("Maximum players");
  await expect(max).toHaveAttribute("aria-invalid", "true");
  await expect(max).toHaveAccessibleDescription(
    "Maximum players cannot be less than the minimum.",
  );
  await expect(page.getByLabel("Minimum players")).toHaveValue("4");
  await expect(max).toHaveValue("2");
  await expect(page.getByLabel("Description")).toHaveValue("Kept text");

  await page.getByLabel("Year").fill("abc");
  await page.getByRole("button", { name: "Save facts" }).click();
  await expect(page.getByLabel("Year")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Year")).toHaveAccessibleDescription(
    "Year must be a whole number.",
  );
});

test("Cancel leaves the facts unchanged", async ({ page }) => {
  await openGame(page, "Wingspan");
  await openManage(page);
  await page.getByRole("link", { name: "Add facts" }).click();
  await page.getByLabel("Year").fill("1999");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/games\/[0-9a-f-]{36}$/);
  await expect(page.getByText("1999")).toHaveCount(0);
});

test("several copies each get their own status control", async ({
  page,
}, testInfo) => {
  const gameId = await openGame(page, "Heat");
  const account = accountFor(testInfo.project.name, "game");
  const { error } = await adminClient()
    .from("collection_entries")
    .insert({ user_id: account.id, game_id: gameId, status: "wishlist" });
  expect(error).toBeNull();

  await page.reload();
  await expect(page.locator("p", { hasText: /^Copy 1$/ })).toBeVisible();
  await expect(page.locator("p", { hasText: /^Copy 2$/ })).toBeVisible();
  const copy2 = page.getByRole("group", { name: "Status of copy 2" });
  await expect(
    copy2.getByRole("button", { name: "Wishlist", pressed: true }),
  ).toBeVisible();
  await copy2.getByRole("button", { name: "Interested" }).click();
  await expect(
    copy2.getByRole("button", { name: "Interested", pressed: true }),
  ).toBeVisible();
  // Copy 1 is untouched.
  const copy1 = page.getByRole("group", { name: "Status of copy 1" });
  await expect(
    copy1.getByRole("button", { name: "Owned", pressed: true, exact: true }),
  ).toBeVisible();
});

test("games that are not mine, or do not exist, show the same not-found page", async ({
  page,
  browser,
  baseURL,
}) => {
  const gameId = await openGame(page, "Private to me");

  for (const path of [
    `/games/${randomUUID()}`,
    "/games/abc",
    `/games/${randomUUID()}/edit`,
  ]) {
    await page.goto(path);
    await expect(page.getByText("We could not find that game")).toBeVisible();
  }

  const other = await createAccount("game-other");
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

    for (const path of [`/games/${gameId}`, `/games/${gameId}/edit`]) {
      await otherPage.goto(`${baseURL}${path}`);
      await expect(
        otherPage.getByText("We could not find that game"),
      ).toBeVisible();
      await expect(otherPage.getByText("Private to me")).toHaveCount(0);
    }
    await context.close();
  } finally {
    await deleteAccount(other.id);
  }
});

test("every status change is kept in the History", async ({ page }) => {
  await openGame(page, "Wingspan");
  const history = page.getByRole("region", { name: "History" });
  // Collapsed by default.
  await expect(history.getByText("Added as Owned")).toBeHidden();
  await history.locator("summary").click();
  await expect(history.getByText("Added as Owned")).toBeVisible();

  await page.getByRole("button", { name: "Wishlist" }).click();
  await expect(history.getByText("Owned → Wishlist")).toBeVisible();

  await page.getByRole("button", { name: "Previously owned" }).click();
  await expect(history.getByText("Wishlist → Previously owned")).toBeVisible();

  // Listed in the order recorded: the latest change is on top and matches the current status.
  const rows = history.getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Wishlist → Previously owned");
  await expect(rows.nth(2)).toContainText("Added as Owned");
  await expect(
    page.getByRole("button", { name: "Previously owned", pressed: true }),
  ).toBeVisible();

  // It survives a reload, and the page still fits.
  await page.reload();
  await history.locator("summary").click();
  await expect(rows).toHaveCount(3);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("each copy has its own history", async ({ page }, testInfo) => {
  const gameId = await openGame(page, "Heat");
  const account = accountFor(testInfo.project.name, "game");
  const { error } = await adminClient()
    .from("collection_entries")
    .insert({ user_id: account.id, game_id: gameId, status: "wishlist" });
  expect(error).toBeNull();
  await page.reload();

  const copy2 = page.getByRole("group", { name: "Status of copy 2" });
  await copy2.getByRole("button", { name: "Interested" }).click();
  await expect(
    copy2.getByRole("button", { name: "Interested", pressed: true }),
  ).toBeVisible();

  const history = page.getByRole("region", { name: "History" });
  await history.locator("summary").click();
  await expect(history.getByRole("heading", { name: "Copy 1" })).toBeVisible();
  await expect(history.getByRole("heading", { name: "Copy 2" })).toBeVisible();
  await expect(history.getByText("Added as Owned")).toBeVisible();
  await expect(history.getByText("Added as Wishlist")).toBeVisible();
  await expect(history.getByText("Wishlist → Interested")).toBeVisible();
  // Copy 1 never changed, so it has only its first row.
  await expect(history.getByText("Owned → ")).toHaveCount(0);
});
