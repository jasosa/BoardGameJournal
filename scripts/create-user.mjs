// Creates an account. Public sign-up is off (ADR-0006, ADR-0008), so this is the only way in.
//
// Usage:  npm run user:create -- you@example.com
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment.
// `npm run user:create` loads a local env file if one exists. Server-side only: never import
// this from app code, and never run it with a service role key you would not use on that project.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run user:create -- <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const password = randomBytes(18).toString("base64url");
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error || !data.user) {
  console.error(
    `Could not create the account: ${error?.message ?? "unknown error"}`,
  );
  process.exit(1);
}

console.log(`Created ${email} (${data.user.id}).`);
console.log(`Password (shown once, store it safely): ${password}`);
