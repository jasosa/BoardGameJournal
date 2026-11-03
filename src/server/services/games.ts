import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { coverRef } from "@/features/catalogue/cover";
import { isHexColour } from "@/features/catalogue/cover-colours";
import {
  updateGameFactsInput,
  type GameDetails,
} from "@/features/catalogue/schemas";
import {
  COLLECTION_STATUSES,
  type CollectionStatus,
  type StatusChange,
} from "@/features/collection/schemas";
import type { Database } from "@/lib/database/types";
import { err, ok, type Result } from "@/lib/result";

type Client = SupabaseClient<Database>;

export type GameDossier = {
  game: GameDetails;
  /** The caller's own copies of this game, oldest first. */
  entries: { entryId: string; status: CollectionStatus }[];
  /** Every status change of those copies, latest logged first. */
  history: StatusChange[];
};

function isStatus(value: string): value is CollectionStatus {
  return (COLLECTION_STATUSES as readonly string[]).includes(value);
}

/**
 * One game with the signed-in person's copies of it. A game the person cannot see (not
 * theirs, or it does not exist) is `not_found`, never an error that says which.
 */
export async function getGameDossier(
  supabase: Client,
  userId: string,
  gameId: string,
): Promise<Result<GameDossier>> {
  if (!z.uuid().safeParse(gameId).success) {
    return err("not_found", "We could not find that game.");
  }

  const { data: game, error } = await supabase
    .from("games")
    .select(
      "id, name, source, created_at, created_by, visibility, description, year, min_players, max_players, play_time_min",
    )
    .eq("id", gameId)
    .maybeSingle();
  if (error) return err("load_failed", "We could not load this game.");
  if (!game) return err("not_found", "We could not find that game.");

  const { data: rows, error: entriesError } = await supabase
    .from("collection_entries")
    .select("id, status")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });
  if (entriesError) return err("load_failed", "We could not load this game.");

  const entryIds = rows.map((row) => row.id);
  const { data: changeRows, error: historyError } =
    entryIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("collection_status_changes")
          .select(
            "id, entry_id, from_status, to_status, changed_on, recorded_at",
          )
          .in("entry_id", entryIds)
          // In the order they were logged, so the top row always matches the current status.
          // The date the person gave is shown as the label, and may be earlier.
          .order("recorded_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(500);
  if (historyError) return err("load_failed", "We could not load this game.");

  const { data: coverRow, error: coverError } = await supabase
    .from("game_images")
    .select("id, storage_path, dominant_color, accent_color")
    .eq("game_id", gameId)
    .eq("kind", "cover")
    .maybeSingle();
  if (coverError) return err("load_failed", "We could not load this game.");

  return ok({
    game: {
      id: game.id,
      title: game.name,
      source: game.source,
      createdAt: game.created_at,
      // Matches the RLS update policy: own private manual games only.
      editable:
        game.created_by === userId &&
        game.visibility === "private" &&
        game.source === "manual",
      description: game.description,
      year: game.year,
      minPlayers: game.min_players,
      maxPlayers: game.max_players,
      playTimeMin: game.play_time_min,
      cover:
        coverRow?.storage_path != null
          ? coverRef(coverRow.id, coverRow.storage_path)
          : null,
      // Decoration only, so anything that is not a plain #rrggbb is ignored.
      coverColours:
        coverRow?.storage_path != null &&
        isHexColour(coverRow.dominant_color) &&
        isHexColour(coverRow.accent_color)
          ? { tint: coverRow.dominant_color, glow: coverRow.accent_color }
          : null,
    },
    entries: rows.flatMap((row) =>
      isStatus(row.status) ? [{ entryId: row.id, status: row.status }] : [],
    ),
    history: changeRows.flatMap((row) =>
      isStatus(row.to_status) &&
      (row.from_status === null || isStatus(row.from_status))
        ? [
            {
              id: row.id,
              entryId: row.entry_id,
              from: row.from_status,
              to: row.to_status,
              changedOn: row.changed_on,
              recordedAt: row.recorded_at,
            },
          ]
        : [],
    ),
  });
}

type FactsFieldName =
  "year" | "minPlayers" | "maxPlayers" | "playTimeMin" | "description";

/** Result of a failed edit. `fieldErrors` holds one message per field that has a problem. */
export type FactsError = {
  code: string;
  message: string;
  fieldErrors?: Partial<Record<FactsFieldName, string>>;
};

const FIELDS: readonly FactsFieldName[] = [
  "year",
  "minPlayers",
  "maxPlayers",
  "playTimeMin",
  "description",
];

/** Validates and saves the facts of a game. RLS allows only the creator of a manual game. */
export async function updateGameFacts(
  supabase: Client,
  input: unknown,
): Promise<{ ok: true; gameId: string } | { ok: false; error: FactsError }> {
  const parsed = updateGameFactsInput.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<FactsFieldName, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = FIELDS.find((name) => name === issue.path[0]);
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return {
      ok: false,
      error: {
        code: "validation",
        message:
          Object.values(fieldErrors)[0] ??
          parsed.error.issues[0]?.message ??
          "Check the form and try again.",
        fieldErrors,
      },
    };
  }

  const facts = parsed.data;
  const { data, error } = await supabase
    .from("games")
    .update({
      year: facts.year,
      min_players: facts.minPlayers,
      max_players: facts.maxPlayers,
      play_time_min: facts.playTimeMin,
      description: facts.description,
    })
    .eq("id", facts.gameId)
    .select("id");
  if (error) {
    return {
      ok: false,
      error: { code: "save_failed", message: "We could not save. Try again." },
    };
  }
  if (data.length === 0) {
    return {
      ok: false,
      error: { code: "not_found", message: "We could not find that game." },
    };
  }
  // The id of the row that was actually saved, not the id from the form.
  return { ok: true, gameId: data[0]!.id };
}
