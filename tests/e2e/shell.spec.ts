import { expect, test } from "@playwright/test";

test("shows the right navigation for the viewport", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  // Role queries ignore hidden elements, so exactly one visible nav is expected.
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
  const header = page.locator("header nav");
  const bottom = page.locator("body > nav");
  await expect(isMobile ? bottom : header).toBeVisible();
  await expect(isMobile ? header : bottom).toBeHidden();
});

test("Quick Capture is reachable and opens its page", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: /Quick Capture/ })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/capture$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Add a game" }),
  ).toBeVisible();
});

test("marks the current page in the navigation", async ({ page }) => {
  await page.goto("/library");
  await expect(
    page
      .getByRole("link", { name: "Library", exact: true })
      .filter({ visible: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("theme toggle switches and remembers the theme", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

for (const path of ["/", "/library", "/journal", "/settings", "/capture"]) {
  test(`no horizontal scroll on ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
}

test("active item in the bottom nav shows an ink marker", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "bottom nav is mobile only");
  await page.goto("/library");
  const link = page.locator("body > nav").getByRole("link", {
    name: "Library",
  });
  const [border, ink] = await Promise.all([
    link.evaluate((el) => getComputedStyle(el).borderTopColor),
    page.evaluate(() => getComputedStyle(document.body).color),
  ]);
  expect(border).toBe(ink);
});
