import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ASSESSMENT_LIMIT } from "@/features/assessments/history";
import {
  addAssessmentInput,
  type Assessment,
} from "@/features/assessments/schemas";
import type { Database } from "@/lib/database/types";
import { err, ok, type Result } from "@/lib/result";

type Client = SupabaseClient<Database>;

export type AssessmentError = {
  code: "validation" | "not_found" | "save_failed";
  message: string;
  /** Message per field, keyed like the form: overall, assessedOn. */
  fieldErrors: Record<string, string>;
};

function failure(
  code: AssessmentError["code"],
  message: string,
  fieldErrors: Record<string, string> = {},
): { ok: false; error: AssessmentError } {
  return { ok: false, error: { code, message, fieldErrors } };
}

/**
 * Adds one rating (a new opinion, never an edit). Row security decides who may rate which game:
 * a game the person cannot see is `not_found`.
 */
export async function addAssessment(
  supabase: Client,
  input: unknown,
): Promise<
  { ok: true; assessmentId: string } | { ok: false; error: AssessmentError }
> {
  const parsed = addAssessmentInput.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = typeof issue.path[0] === "string" ? issue.path[0] : null;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return failure(
      "validation",
      Object.values(fieldErrors)[0] ?? "Check the rating and try again.",
      fieldErrors,
    );
  }

  const value = parsed.data;
  const { data, error } = await supabase.rpc("add_assessment", {
    p_game_id: value.gameId,
    p_overall: value.overall,
    ...(value.assessedOn ? { p_assessed_on: value.assessedOn } : {}),
  });
  if (error || !data) {
    if (error?.message.includes("invalid_date")) {
      return failure("validation", "Choose a date that is not in the future.", {
        assessedOn: "Choose a date that is not in the future.",
      });
    }
    // 42501: row security refused it (game not visible). 23503: no such game.
    if (error?.code === "42501" || error?.code === "23503") {
      return failure("not_found", "We could not find that game.");
    }
    // The form is checked before this point, so this only comes from a call that skipped it.
    if (
      error &&
      (["22023", "22P02", "23514"].includes(error.code) ||
        /invalid_overall/.test(error.message))
    ) {
      return failure("validation", "Check the rating and try again.");
    }
    return failure("save_failed", "We could not save the rating. Try again.");
  }
  return { ok: true, assessmentId: data };
}

/**
 * The signed-in person's ratings of one game, latest first (newest date, then the one logged
 * last). Row security limits rows to the caller.
 */
export async function listAssessments(
  supabase: Client,
  userId: string,
  gameId: string,
): Promise<Result<Assessment[]>> {
  if (!z.uuid().safeParse(gameId).success) return ok([]);

  const { data, error } = await supabase
    .from("assessments")
    .select("id, game_id, assessed_on, overall, created_at")
    // RLS already limits rows to the caller; the filter is a second guard.
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .order("assessed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(ASSESSMENT_LIMIT);
  if (error) return err("load_failed", "We could not load the ratings.");

  return ok(
    data.map((row) => ({
      id: row.id,
      gameId: row.game_id,
      assessedOn: row.assessed_on,
      overall: Number(row.overall),
      createdAt: row.created_at,
    })),
  );
}
