"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/form-state";
import { requireUser } from "@/server/authorization/require-user";
import {
  archiveEntry,
  changeEntryStatus,
  deleteEntry,
  restoreEntry,
} from "@/server/services/collection";

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

function entryInput(formData: FormData) {
  return { entryId: String(formData.get("entryId") ?? "") };
}

export async function archiveCopy(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const result = await archiveEntry(supabase, entryInput(formData));
  if (!result.ok) return { error: result.error.message };

  revalidatePath("/games/[gameId]", "page");
  revalidatePath("/library");
  return { error: null };
}

export async function restoreCopy(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const result = await restoreEntry(supabase, entryInput(formData));
  if (!result.ok) return { error: result.error.message };

  revalidatePath("/games/[gameId]", "page");
  revalidatePath("/library");
  return { error: null };
}

export async function deleteCopy(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  const result = await deleteEntry(supabase, entryInput(formData));
  if (!result.ok) return { error: result.error.message };

  revalidatePath("/games/[gameId]", "page");
  revalidatePath("/library");
  // The game page no longer exists when its last copy and the game itself are gone.
  if (result.data.gameDeleted) redirect("/library?archived=1");
  return { error: null };
}
