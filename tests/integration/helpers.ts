import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "../support/accounts";
import { readLocalSupabase } from "../support/supabase-env";

const config = readLocalSupabase();
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

/** Service role client. Tests only. Bypasses RLS. */
export const admin: SupabaseClient = adminClient();

/** Client with no session (anonymous visitor). */
export function anonymousClient(): SupabaseClient {
  return createClient(config.url, config.anonKey, clientOptions);
}

export type TestUser = { id: string; email: string; client: SupabaseClient };

const createdUserIds: string[] = [];

/** Creates a confirmed user with the admin API and returns a signed-in client. */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID()}@test.local`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  createdUserIds.push(data.user.id);

  const client = anonymousClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, email, client };
}

/** Deletes every user created by createTestUser. Cascades to their rows. */
export async function deleteTestUsers(): Promise<void> {
  for (const id of createdUserIds.splice(0)) {
    await admin.auth.admin.deleteUser(id);
  }
}

/** Inserts a public provider-style game with the service role. */
export async function insertPublicGame(name: string): Promise<string> {
  const { data, error } = await admin
    .from("games")
    .insert({
      name,
      source: "test-provider",
      external_id: randomUUID(),
      visibility: "public",
      created_by: null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
