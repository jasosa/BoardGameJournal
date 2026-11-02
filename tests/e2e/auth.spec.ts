import { expect, test } from "@playwright/test";
import {
  createAccount,
  deleteAccount,
  type Account,
} from "../support/accounts";
import { readLocalSupabase } from "../support/supabase-env";

// These tests start signed out.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("sign in and out", () => {
  let account: Account;

  test.beforeAll(async () => {
    account = await createAccount("auth");
  });
  test.afterAll(async () => {
    await deleteAccount(account.id);
  });

  test("signed-out visitors are sent to the login page", async ({ page }) => {
    for (const path of ["/", "/library", "/capture", "/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
    await expect(
      page.getByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("a forged session cookie is not accepted", async ({ page, context }) => {
    // Cookie name follows @supabase/ssr: sb-<first label of the host>-auth-token.
    const host = new URL(readLocalSupabase().url).hostname.split(".")[0];
    await context.addCookies([
      {
        name: `sb-${host}-auth-token`,
        value: "base64-ZmFrZS10b2tlbg",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/library");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Your games")).toHaveCount(0);
  });

  test("the session cookie cannot be read by page scripts", async ({
    page,
    context,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);
    const session = (await context.cookies()).filter((c) =>
      /^sb-.*-auth-token/.test(c.name),
    );
    expect(session.length).toBeGreaterThan(0);
    for (const cookie of session) expect(cookie.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "auth-token",
    );
  });

  test("a wrong password shows one generic message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form [role=alert]")).toHaveText(
      "Email or password is incorrect.",
    );
    await expect(page).toHaveURL(/\/login$/);
    // The email is kept so it can be corrected. The password never is.
    await expect(page.getByLabel("Email")).toHaveValue(account.email);
    await expect(page.getByLabel("Password")).toHaveValue("");
  });

  test("an unknown email shows the same message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@test.local");
    await page.getByLabel("Password").fill("whatever-it-is");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form [role=alert]")).toHaveText(
      "Email or password is incorrect.",
    );
  });

  test("the right password signs in, and sign out ends the session", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Today" }),
    ).toBeVisible();

    // Signed in users do not see the login page.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/library");
    await expect(page).toHaveURL(/\/login$/);
  });
});
