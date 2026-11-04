import { expect, type Page } from "@playwright/test";

/** Adds a game through the form and waits for the Library. */
export async function addGame(page: Page, title: string, status?: string) {
  await page.goto("/capture");
  await page.getByLabel("Title").fill(title);
  if (status) await page.getByLabel(status, { exact: true }).check();
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(page).toHaveURL(/\/library$/);
}

/** Opens the Manage menu on a game page (Edit facts, cover, Remove from library). */
export async function openManage(page: Page) {
  const trigger = page.getByRole("button", { name: "Manage" });
  if ((await trigger.getAttribute("aria-expanded")) !== "true") {
    await trigger.click();
  }
}

/** Opens the Cover chip menu on a game page that has a cover (Replace cover, Remove cover). */
export async function openCoverMenu(page: Page) {
  const trigger = page.getByRole("button", { name: "Cover", exact: true });
  if ((await trigger.getAttribute("aria-expanded")) !== "true") {
    await trigger.click();
  }
}
