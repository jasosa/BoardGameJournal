"use server";

import { redirect } from "next/navigation";
import type { AddGameState } from "@/components/capture/AddGameForm";
import { addManualGame } from "@/server/services/collection";
import { requireUser } from "@/server/authorization/require-user";

export async function addGame(
  _previous: AddGameState,
  formData: FormData,
): Promise<AddGameState> {
  const { supabase } = await requireUser();

  const title = String(formData.get("title") ?? "");
  const status = String(formData.get("status") ?? "");
  const addedOn = String(formData.get("addedOn") ?? "");

  const result = await addManualGame(supabase, { title, status, addedOn });
  if (!result.ok) {
    // Keep what the person typed so nothing is lost on an error.
    // The only input a person can get wrong is the title: a status is always selected.
    const field = result.error.code === "validation" ? "title" : null;
    return { error: result.error.message, field, title, status };
  }
  redirect("/library");
}
