import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type FullConfig } from "@playwright/test";
import { createAccount, type Account } from "../support/accounts";
import {
  ACCOUNTS_FILE,
  AUTH_DIR,
  ACCOUNT_KINDS,
  accountKey,
  storageStatePath,
} from "./accounts";

/**
 * Accounts per Playwright project, signed in once through the real login form. One account
 * per spec area (see ACCOUNT_KINDS), so specs that change a library in parallel never share one.
 * Sign-ins are rate limited, so tests reuse the saved state instead of logging in each time.
 */
export default async function globalSetup(config: FullConfig) {
  mkdirSync(AUTH_DIR, { recursive: true });
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";
  const accounts: Record<string, Account> = {};

  const browser = await chromium.launch();
  try {
    for (const project of config.projects) {
      for (const kind of ACCOUNT_KINDS) {
        const key = accountKey(project.name, kind);
        const account = await createAccount(key);
        accounts[key] = account;

        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(`${baseURL}/login`);
        await page.getByLabel("Email").fill(account.email);
        await page.getByLabel("Password").fill(account.password);
        await page.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL(`${baseURL}/`);
        await context.storageState({ path: storageStatePath(key) });
        await context.close();
      }
    }
  } finally {
    await browser.close();
    // Written even on failure so teardown can remove accounts that were created.
    writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts));
  }
}
