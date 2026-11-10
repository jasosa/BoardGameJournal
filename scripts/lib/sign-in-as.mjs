// Shared by the local seed scripts. Signs in as an existing user without their password: the
// service role key makes a one-off magic link, and the token is exchanged for a normal session.
// After that every call runs as the user, so RLS and storage policies apply as in the app.
//
// Local development only. It refuses any URL that is not localhost. Server-side scripts only:
// never import this from app code.

import { createClient } from "@supabase/supabase-js";

export async function signInAs(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    console.error(
      `Refusing to seed ${url}. This script is for the local database only.`,
    );
    process.exit(1);
  }

  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceRoleKey, options);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    fail(`Finding the account ${email}`, linkError ?? "no token returned");
  }

  const db = createClient(url, anonKey, options);
  const { data, error } = await db.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (error || !data.user) fail("Signing in", error ?? "no user returned");
  return { db, userId: data.user.id };
}

export function fail(step, error) {
  console.error(`${step} failed: ${error?.message ?? error}`);
  process.exit(1);
}
