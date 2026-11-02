import { expect, type Page } from "@playwright/test";

/** Adds a game through the form and waits for the Library. */
export async function addGame(page: Page, title: string, status?: string) {
  await page.goto("/capture");
  await page.getByLabel("Title").fill(title);
  if (status) await page.getByLabel(status, { exact: true }).check();
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(page).toHaveURL(/\/library$/);
}
