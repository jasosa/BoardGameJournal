import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/database/server";

/**
 * The signed-in user, validated with the auth server (not just read from the cookie).
 * Call this at the start of every server action and every page that reads personal data.
 * The proxy redirect is a convenience, not security.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { user: data.user, supabase };
}
