import { readFileSync } from "node:fs";
import path from "node:path";
import type { Account } from "../support/accounts";

export const AUTH_DIR = path.join(__dirname, ".auth");

/** Where global setup stores the sign-in state of each project's account. */
export function storageStatePath(project: string): string {
  return path.join(AUTH_DIR, `${project}.json`);
}

const ACCOUNTS_FILE = path.join(AUTH_DIR, "accounts.json");

/** The signed-in account that global setup created for a Playwright project. */
export function accountFor(project: string): Account {
  const all = JSON.parse(readFileSync(ACCOUNTS_FILE, "utf8")) as Record<
    string,
    Account
  >;
  const account = all[project];
  if (!account) throw new Error(`No account for project ${project}`);
  return account;
}

export { ACCOUNTS_FILE };
