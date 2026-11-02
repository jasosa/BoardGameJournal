import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_COOKIE_OPTIONS } from "./cookie-options";
import { supabaseEnv } from "./env";
import type { Database } from "./types";

/** Per-request Supabase client that carries the signed-in user's session (anon key + cookies). */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient<Database>(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, which cannot set cookies.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
