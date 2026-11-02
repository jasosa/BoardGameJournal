import { existsSync, readFileSync, rmSync } from "node:fs";
import { deleteAccount, type Account } from "../support/accounts";
import { ACCOUNTS_FILE, AUTH_DIR } from "./accounts";

export default async function globalTeardown() {
  if (existsSync(ACCOUNTS_FILE)) {
    const accounts = JSON.parse(readFileSync(ACCOUNTS_FILE, "utf8")) as Record<
      string,
      Account
    >;
    for (const account of Object.values(accounts)) {
      await deleteAccount(account.id);
    }
  }
  rmSync(AUTH_DIR, { recursive: true, force: true });
}
