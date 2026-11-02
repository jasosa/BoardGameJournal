/**
 * Session cookie flags for the server and proxy clients. The app has no browser Supabase
 * client, so page scripts never need to read the session: keep it httpOnly. Revisit if a
 * browser client is ever added.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;
