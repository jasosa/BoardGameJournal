import { NextResponse } from "next/server";
import { createClient } from "@/lib/database/server";
import { buildExport } from "@/server/services/data-export";

// Built for the signed-in person on every request. Never cached or shared.
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * The export file. Read-only: it saves nothing on the server. The browser names the file with
 * the person's local date, so this name is only a fallback (UTC date).
 *
 * Without a session this answers 401 as JSON. It does not redirect to the login page, because
 * the screen fetches this address and would otherwise save the login page as the export.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json(
      { error: "Not signed in." },
      { status: 401, headers: NO_STORE },
    );
  }

  const built = await buildExport(supabase, data.user.id);
  if (!built.ok) {
    return NextResponse.json(
      { error: built.error.message },
      { status: 500, headers: NO_STORE },
    );
  }
  const name = `meeple-journal-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(built.data.text, {
    headers: {
      ...NO_STORE,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
