"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  EditFactsState,
  FactsValues,
} from "@/components/game/EditFactsForm";
import { requireUser } from "@/server/authorization/require-user";
import { updateGameFacts } from "@/server/services/games";

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

export async function updateFacts(
  _previous: EditFactsState,
  formData: FormData,
): Promise<EditFactsState> {
  const { supabase } = await requireUser();

  const gameId = text(formData, "gameId");
  const values: FactsValues = {
    year: text(formData, "year"),
    minPlayers: text(formData, "minPlayers"),
    maxPlayers: text(formData, "maxPlayers"),
    playTimeMin: text(formData, "playTimeMin"),
    description: text(formData, "description"),
  };

  const result = await updateGameFacts(supabase, { gameId, ...values });
  if (!result.ok) {
    // Keep what the person typed so nothing is lost on an error.
    return {
      error: result.error.message,
      fieldErrors: result.error.fieldErrors,
      values,
    };
  }

  revalidatePath(`/games/${result.gameId}`);
  revalidatePath("/library");
  redirect(`/games/${result.gameId}`);
}
