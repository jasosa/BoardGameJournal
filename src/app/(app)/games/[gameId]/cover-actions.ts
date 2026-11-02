"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/form-state";
import { removeCoverInput, uploadCoverInput } from "@/features/catalogue/cover";
import { requireUser } from "@/server/authorization/require-user";
import { removeCover, uploadCover } from "@/server/services/covers";

function revalidateGame(gameId: string) {
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/library");
}

export async function uploadCoverAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await requireUser();
  const parsed = uploadCoverInput.safeParse({
    gameId: formData.get("gameId"),
    cover: formData.get("cover"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Choose an image first.",
    };
  }

  const { gameId, cover } = parsed.data;
  const result = await uploadCover(supabase, user.id, { gameId, file: cover });
  if (!result.ok) return { error: result.error.message };

  revalidateGame(gameId);
  return { error: null };
}

export async function removeCoverAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await requireUser();
  const parsed = removeCoverInput.safeParse({ gameId: formData.get("gameId") });
  if (!parsed.success) return { error: "We could not find that game." };

  const { gameId } = parsed.data;
  const result = await removeCover(supabase, user.id, gameId);
  if (!result.ok) return { error: result.error.message };

  revalidateGame(gameId);
  return { error: null };
}
