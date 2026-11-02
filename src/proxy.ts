import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS } from "@/lib/database/cookie-options";
import { supabaseEnv } from "@/lib/database/env";

/**
 * Optimistic gate: refreshes the session cookie and redirects by sign-in state.
 * Real authorisation happens in server code (requireUser) and in RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Must run before any response is returned so a refreshed session is written.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const onLogin = request.nextUrl.pathname === "/login";

  if (!signedIn && !onLogin) return redirectTo("/login", request, response);
  if (signedIn && onLogin) return redirectTo("/", request, response);
  return response;
}

function redirectTo(path: string, request: NextRequest, from: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  // Keep any refreshed session cookies on the redirect.
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
