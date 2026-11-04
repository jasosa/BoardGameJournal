"use server";

import { revalidatePath } from "next/cache";
import type { DeleteResult, SaveResult } from "@/components/thoughts/types";
import { acceptableWrittenOn } from "@/features/thoughts/schemas";
import { requireUser } from "@/server/authorization/require-user";
import {
  addThought,
  deleteThought,
  updateThought,
} from "@/server/services/thoughts";

/** The person comes from the session; the screen sends only the thought. */
export async function addThoughtAction(input: {
  gameId: string;
  body: string;
  topics: string[];
  writtenOn: string;
}): Promise<SaveResult> {
  const { supabase } = await requireUser();
  // A thought is always written today: the date from the screen counts only within a day of it.
  const result = await addThought(supabase, {
    ...input,
    writtenOn: acceptableWrittenOn(input.writtenOn),
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.message,
      field: result.error.fieldErrors.body ? "body" : undefined,
    };
  }
  revalidatePath("/games/[gameId]", "page");
  return { ok: true, thought: result.thought };
}

export async function updateThoughtAction(input: {
  thoughtId: string;
  body: string;
  topics: string[];
}): Promise<SaveResult> {
  const { supabase } = await requireUser();
  const result = await updateThought(supabase, input);
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.message,
      field: result.error.fieldErrors.body ? "body" : undefined,
    };
  }
  revalidatePath("/games/[gameId]", "page");
  return { ok: true, thought: result.thought };
}

export async function deleteThoughtAction(input: {
  thoughtId: string;
}): Promise<DeleteResult> {
  const { supabase } = await requireUser();
  const result = await deleteThought(supabase, input);
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath("/games/[gameId]", "page");
  return { ok: true, thoughtId: result.data.thoughtId };
}
