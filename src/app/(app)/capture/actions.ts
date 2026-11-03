"use server";

import { redirect } from "next/navigation";
import type { AddGameState } from "@/components/capture/AddGameForm";
import {
  addGameCopy,
  addManualGame,
  findTitleMatches,
} from "@/server/services/collection";
import { requireUser } from "@/server/authorization/require-user";

export async function addGame(
  _previous: AddGameState,
  formData: FormData,
): Promise<AddGameState> {
  const { user, supabase } = await requireUser();

  const title = String(formData.get("title") ?? "");
  const status = String(formData.get("status") ?? "");
  const addedOn = String(formData.get("addedOn") ?? "");
  // Set only by the "Add another copy" button, which names the game already held.
  const copyOf = String(formData.get("copyOf") ?? "");

  if (copyOf) {
    const copy = await addGameCopy(supabase, {
      gameId: copyOf,
      status,
      addedOn,
    });
    if (!copy.ok) {
      return { error: copy.error.message, field: null, title, status };
    }
    redirect(`/games/${copyOf}`);
  }

  // Warn before saving a title the person already has. If the check itself fails, save anyway:
  // the warning is a help, and it must not stand between a person and their own data.
  const matches = await findTitleMatches(supabase, user.id, title);
  if (matches.ok && matches.data.length > 0) {
    return { error: null, title, status, duplicates: matches.data };
  }

  const result = await addManualGame(supabase, { title, status, addedOn });
  if (!result.ok) {
    // Keep what the person typed so nothing is lost on an error.
    // The only input a person can get wrong is the title: a status is always selected.
    const field = result.error.code === "validation" ? "title" : null;
    return { error: result.error.message, field, title, status };
  }
  redirect("/library");
}
