import { readFileSync } from "node:fs";
import path from "node:path";
import type { Account } from "../support/accounts";

export const AUTH_DIR = path.join(__dirname, ".auth");

/** One signed-in account per project and kind. "game", "cover", "library" and "archive" belong to the game page, cover, Library and archive specs. */
export const ACCOUNT_KINDS = [
  "main",
  "game",
  "cover",
  "library",
  "archive",
  "rating",
  "thoughts",
  "data",
] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/** Key of an account. The main account keeps the plain project name. */
export function accountKey(project: string, kind: AccountKind = "main") {
  return kind === "main" ? project : `${project}-${kind}`;
}

/** Where global setup stores the sign-in state of an account. */
export function storageStatePath(key: string): string {
  return path.join(AUTH_DIR, `${key}.json`);
}

const ACCOUNTS_FILE = path.join(AUTH_DIR, "accounts.json");

/** The signed-in account that global setup created for a project and kind. */
export function accountFor(
  project: string,
  kind: AccountKind = "main",
): Account {
  const all = JSON.parse(readFileSync(ACCOUNTS_FILE, "utf8")) as Record<
    string,
    Account
  >;
  const account = all[accountKey(project, kind)];
  if (!account) throw new Error(`No account for ${project} ${kind}`);
  return account;
}

export { ACCOUNTS_FILE };
