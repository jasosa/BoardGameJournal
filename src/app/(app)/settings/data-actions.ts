"use server";

import { revalidatePath } from "next/cache";
import type { ImportResult } from "@/components/account/types";
import { requireUser } from "@/server/authorization/require-user";
import { importAccount } from "@/server/services/data-export";

/**
 * Puts an export file into the signed-in person's empty account. The person comes from the
 * session; the screen sends only the file's text.
 */
export async function importAccountAction(text: string): Promise<ImportResult> {
  const { supabase } = await requireUser();
  if (typeof text !== "string") {
    return {
      ok: false,
      code: "refused",
      message:
        "The file did not pass the check on the server, so nothing was saved. Choose the file again, or export it again.",
    };
  }
  const result = await importAccount(supabase, text);
  if (!result.ok) {
    const code = result.error.code;
    return {
      ok: false,
      code: code === "not_empty" || code === "refused" ? code : "failed",
      message: result.error.message,
    };
  }
  revalidatePath("/settings");
  return { ok: true, counts: result.data };
}
