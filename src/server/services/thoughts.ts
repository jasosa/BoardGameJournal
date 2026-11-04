import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { THOUGHT_LIMIT, sortNewestFirst } from "@/features/thoughts/list";
import {
  addThoughtInput,
  deleteThoughtInput,
  updateThoughtInput,
  type Thought,
} from "@/features/thoughts/schemas";
import { isThoughtTopic } from "@/features/thoughts/topics";
import type { Database } from "@/lib/database/types";
import { err, ok, type Result } from "@/lib/result";

type Client = SupabaseClient<Database>;

const COLUMNS = "id, game_id, body, topics, written_on, created_at";

type Row = {
  id: string;
  game_id: string;
  body: string;
  topics: string[];
  written_on: string;
  created_at: string;
};

function toThought(row: Row): Thought {
  return {
    id: row.id,
    gameId: row.game_id,
    body: row.body,
    topics: row.topics.filter(isThoughtTopic),
    writtenOn: row.written_on,
    createdAt: row.created_at,
  };
}

export type ThoughtError = {
  code: "validation" | "not_found" | "save_failed";
  message: string;
  /** Message per field, keyed like the form: body, topics, writtenOn. */
  fieldErrors: Record<string, string>;
};

function failure(
  code: ThoughtError["code"],
  message: string,
  fieldErrors: Record<string, string> = {},
): { ok: false; error: ThoughtError } {
  return { ok: false, error: { code, message, fieldErrors } };
}

function validationFailure(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = typeof issue.path[0] === "string" ? issue.path[0] : null;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return failure(
    "validation",
    Object.values(fieldErrors)[0] ?? "Check the thought and try again.",
    fieldErrors,
  );
}

/**
 * Adds a thought about a game with its topics and returns it as saved. Row security decides who
 * may write about which game: a game the person cannot see is `not_found`.
 */
export async function addThought(
  supabase: Client,
  input: unknown,
): Promise<
  | { ok: true; thoughtId: string; thought: Thought }
  | { ok: false; error: ThoughtError }
> {
  const parsed = addThoughtInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const value = parsed.data;
  const { data, error } = await supabase.rpc("add_thought", {
    p_game_id: value.gameId,
    p_body: value.body,
    p_topics: value.topics,
    ...(value.writtenOn ? { p_written_on: value.writtenOn } : {}),
  });
  if (error || !data) {
    if (error?.code === "22023" && error.message.includes("invalid_date")) {
      return failure("validation", "Choose a date that is not in the future.", {
        writtenOn: "Choose a date that is not in the future.",
      });
    }
    // 42501: row security refused it (game not visible). 23503: no such game.
    if (error?.code === "42501" || error?.code === "23503") {
      return failure("not_found", "We could not find that game.");
    }
    // The form is checked before this point, so this only comes from a call that skipped it.
    if (error && ["22023", "22P02", "23514"].includes(error.code)) {
      return failure("validation", "Check the thought and try again.");
    }
    return failure(
      "save_failed",
      "Could not save your thought. It is still here and on this device. Try again.",
    );
  }

  const { data: row, error: readError } = await supabase
    .from("journal_entries")
    .select(COLUMNS)
    .eq("id", data)
    .maybeSingle();
  if (readError || !row) {
    // The thought is saved but could not be read back. Answering "failed" would invite a retry
    // and a duplicate, so answer with what was saved.
    const now = new Date().toISOString();
    return {
      ok: true,
      thoughtId: data,
      thought: {
        id: data,
        gameId: value.gameId,
        body: value.body,
        topics: value.topics,
        writtenOn: value.writtenOn ?? now.slice(0, 10),
        createdAt: now,
      },
    };
  }
  return { ok: true, thoughtId: data, thought: toThought(row) };
}

/** Changes the text and topics of one of the caller's thoughts. The date written stays. */
export async function updateThought(
  supabase: Client,
  input: unknown,
): Promise<
  | { ok: true; thoughtId: string; thought: Thought }
  | { ok: false; error: ThoughtError }
> {
  const parsed = updateThoughtInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const value = parsed.data;
  const { data, error } = await supabase
    .from("journal_entries")
    .update({ body: value.body, topics: value.topics })
    .eq("id", value.thoughtId)
    .select(COLUMNS);
  if (error) {
    if (["22023", "22P02", "23514"].includes(error.code)) {
      return failure("validation", "Check the thought and try again.");
    }
    return failure(
      "save_failed",
      "Could not save your changes. They are still here and on this device. Try again.",
    );
  }
  // Row security hides other people's thoughts, so no row means "not yours or not there".
  if (data.length === 0) {
    return failure("not_found", "We could not find that thought.");
  }
  return { ok: true, thoughtId: data[0]!.id, thought: toThought(data[0]!) };
}

/** Deletes one of the caller's thoughts for good. */
export async function deleteThought(
  supabase: Client,
  input: unknown,
): Promise<Result<{ thoughtId: string }>> {
  const parsed = deleteThoughtInput.safeParse(input);
  if (!parsed.success) {
    return err("not_found", "We could not find that thought.");
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", parsed.data.thoughtId)
    .select("id");
  if (error) {
    return err("save_failed", "Could not delete this thought. Try again.");
  }
  if (data.length === 0) {
    return err("not_found", "We could not find that thought.");
  }
  return ok({ thoughtId: data[0]!.id });
}

/**
 * The signed-in person's thoughts about one game, newest first. Row security limits rows to the
 * caller. Filtering by topic and paging happen on the screen.
 */
export async function listThoughts(
  supabase: Client,
  userId: string,
  gameId: string,
): Promise<Result<Thought[]>> {
  if (!z.uuid().safeParse(gameId).success) return ok([]);

  const { data, error } = await supabase
    .from("journal_entries")
    .select(COLUMNS)
    // RLS already limits rows to the caller; the filter is a second guard.
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .order("written_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(THOUGHT_LIMIT);
  if (error) return err("load_failed", "Could not load your thoughts.");

  return ok(sortNewestFirst(data.map(toThought)));
}
