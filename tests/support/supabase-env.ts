import { execSync } from "node:child_process";

export type LocalSupabase = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

let cached: LocalSupabase | undefined;

/**
 * Connection values for the local Supabase stack, used by integration and e2e tests.
 * CI exports API_URL, ANON_KEY and SERVICE_ROLE_KEY. Locally they are read from the
 * running stack (`npx supabase start` first).
 */
export function readLocalSupabase(): LocalSupabase {
  if (cached) return cached;
  let vars: Record<string, string | undefined> = process.env;
  if (!vars.API_URL || !vars.ANON_KEY || !vars.SERVICE_ROLE_KEY) {
    const out = execSync("npx supabase status -o env", { encoding: "utf8" });
    vars = { ...process.env };
    for (const line of out.split(/\r?\n/)) {
      const m = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
      if (m?.[1]) vars[m[1]] = m[2];
    }
  }
  const url = vars.API_URL;
  const anonKey = vars.ANON_KEY ?? vars.PUBLISHABLE_KEY;
  const serviceRoleKey = vars.SERVICE_ROLE_KEY ?? vars.SECRET_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Local Supabase values not found. Run `npx supabase start` first.",
    );
  }
  cached = { url, anonKey, serviceRoleKey };
  return cached;
}
