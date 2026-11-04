import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { readLocalSupabase } from "./supabase-env";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service role client for test setup and cleanup only. Bypasses RLS. */
export function adminClient() {
  const { url, serviceRoleKey } = readLocalSupabase();
  return createClient(url, serviceRoleKey, options);
}

export type Account = { id: string; email: string; password: string };

/** Creates a confirmed account with the admin API, as the user:create script does. */
export async function createAccount(label: string): Promise<Account> {
  const email = `${label}-${randomUUID()}@test.local`;
  const password = randomUUID();
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { id: data.user.id, email, password };
}

/** Deletes the account. Its profile, entries and private games cascade away. */
export async function deleteAccount(id: string): Promise<void> {
  await adminClient().auth.admin.deleteUser(id);
}

/** Removes a user's collection entries, ratings, thoughts and private games, keeping the account. */
export async function resetLibrary(userId: string): Promise<void> {
  const admin = adminClient();
  // Ratings and thoughts keep a game alive, so they go first.
  await admin.from("assessments").delete().eq("user_id", userId);
  await admin.from("journal_entries").delete().eq("user_id", userId);
  await admin.from("collection_entries").delete().eq("user_id", userId);
  await admin.from("games").delete().eq("created_by", userId);
}
