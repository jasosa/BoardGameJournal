"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/form-state";
import { requireUser } from "@/server/authorization/require-user";
import { changeEntryStatus } from "@/server/services/collection";

export async function changeStatus(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const result = await changeEntryStatus(supabase, {
    entryId: String(formData.get("entryId") ?? ""),
    status: String(formData.get("status") ?? ""),
    changedOn: String(formData.get("changedOn") ?? ""),
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath("/games/[gameId]", "page");
  revalidatePath("/library");
  return { error: null };
}
