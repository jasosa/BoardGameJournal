import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLECTION_STATUSES,
  addGameCopyInput,
  addManualGameInput,
  changeEntryStatusInput,
  type CollectionStatus,
  type LibraryItem,
  type TitleMatch,
} from "@/features/collection/schemas";
import { normalizeTitle } from "@/features/catalogue/title";
import { coverRef } from "@/features/catalogue/cover";
import type { Database } from "@/lib/database/types";
import { err, ok, type Result } from "@/lib/result";

type Client = SupabaseClient<Database>;

/**
 * Adds a private manual game and a collection entry for the signed-in user in one
 * transaction. The caller passes a client that carries the user's session, so RLS decides
 * what is allowed. Returns the new entry id.
 */
export async function addManualGame(
  supabase: Client,
  input: unknown,
): Promise<Result<{ entryId: string }>> {
  const parsed = addManualGameInput.safeParse(input);
  if (!parsed.success) {
    return err(
      "validation",
      parsed.error.issues[0]?.message ?? "Check the form and try again.",
    );
  }

  const { data, error } = await supabase.rpc("add_manual_game", {
    p_title: parsed.data.title,
    p_status: parsed.data.status,
    ...(parsed.data.addedOn ? { p_added_on: parsed.data.addedOn } : {}),
  });
  if (error || !data) {
    return err("save_failed", "We could not save the game. Try again.");
  }
  return ok({ entryId: data });
}

/** The API returns at most this many rows per request (`max_rows` in supabase/config.toml). */
const API_ROW_LIMIT = 1000;

/**
 * Reads every row of a query, one API page at a time, so a big library is never cut off at the
 * row limit. `page` must use a stable order (add a unique column last).
 */
async function readAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += API_ROW_LIMIT) {
    const { data, error } = await page(from, from + API_ROW_LIMIT - 1);
    if (error || !data) return null;
    rows.push(...data);
    if (data.length < API_ROW_LIMIT) return rows;
  }
}

/**
 * Adds another copy of a game that already exists, for the signed-in user. RLS requires that
 * the game is visible to the caller, so someone else's private game is "not found".
 */
export async function addGameCopy(
  supabase: Client,
  input: unknown,
): Promise<Result<{ entryId: string }>> {
  const parsed = addGameCopyInput.safeParse(input);
  if (!parsed.success) {
    return err(
      "validation",
      parsed.error.issues[0]?.message ?? "Check the form and try again.",
    );
  }

  const { data, error } = await supabase.rpc("add_game_copy", {
    p_game_id: parsed.data.gameId,
    p_status: parsed.data.status,
    ...(parsed.data.addedOn ? { p_added_on: parsed.data.addedOn } : {}),
  });
  if (error || !data) {
    if (error?.message.includes("invalid_date")) {
      return err("validation", "Choose a date that is not in the future.");
    }
    // 42501: row security refused it (game not visible). 23503: no such game.
    if (error?.code === "42501" || error?.code === "23503") {
      return err("not_found", "We could not find that game.");
    }
    return err("save_failed", "We could not save the game. Try again.");
  }
  return ok({ entryId: data });
}

/**
 * Games in the signed-in user's collection whose title is the same as `title` once accents,
 * case and punctuation are ignored. Each game appears once, with the status of its newest copy.
 */
export async function findTitleMatches(
  supabase: Client,
  userId: string,
  title: string,
): Promise<Result<TitleMatch[]>> {
  const wanted = normalizeTitle(title);
  if (wanted === "") return ok([]);

  const data = await readAll((from, to) =>
    supabase
      .from("collection_entries")
      .select("status, game_id, games(name)")
      // RLS already limits rows to the caller; the filter is a second guard.
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  if (!data) {
    return err("load_failed", "We could not check your library.");
  }

  const matches = new Map<string, TitleMatch>();
  for (const row of data) {
    if (!row.games || !isStatus(row.status)) continue;
    if (normalizeTitle(row.games.name) !== wanted) continue;
    // Rows are newest first, so the first one seen is the newest copy.
    if (!matches.has(row.game_id)) {
      matches.set(row.game_id, {
        gameId: row.game_id,
        title: row.games.name,
        status: row.status,
      });
    }
  }
  return ok([...matches.values()]);
}

function isStatus(value: string): value is CollectionStatus {
  return (COLLECTION_STATUSES as readonly string[]).includes(value);
}

/** The signed-in user's collection, newest first. RLS limits rows to the caller. */
export async function listLibrary(
  supabase: Client,
  userId: string,
): Promise<Result<LibraryItem[]>> {
  const data = await readAll((from, to) =>
    supabase
      .from("collection_entries")
      .select(
        "id, status, game_id, games(name, year, min_players, max_players, play_time_min, game_images(id, storage_path, kind))",
      )
      // RLS already limits rows to the caller; the filter is a second guard.
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  if (!data) {
    return err("load_failed", "We could not load your library.");
  }

  const items: LibraryItem[] = [];
  for (const row of data) {
    if (!row.games || !isStatus(row.status)) continue;
    const coverRow = row.games.game_images.find(
      (image) => image.kind === "cover" && image.storage_path,
    );
    items.push({
      entryId: row.id,
      gameId: row.game_id,
      title: row.games.name,
      status: row.status,
      cover: coverRow?.storage_path
        ? coverRef(coverRow.id, coverRow.storage_path)
        : null,
      year: row.games.year,
      minPlayers: row.games.min_players,
      maxPlayers: row.games.max_players,
      playTimeMin: row.games.play_time_min,
    });
  }
  return ok(items);
}

/**
 * Moves one copy of a game to another status and records the change in its history, with the
 * date the person gave (today when blank). Both happen in one database function, which also
 * checks that the copy belongs to the caller. Setting the status it already has changes nothing.
 */
export async function changeEntryStatus(
  supabase: Client,
  input: unknown,
): Promise<Result<{ entryId: string; status: CollectionStatus }>> {
  const parsed = changeEntryStatusInput.safeParse(input);
  if (!parsed.success) {
    return err(
      "validation",
      parsed.error.issues[0]?.message ?? "Check the form and try again.",
    );
  }

  const { data, error } = await supabase.rpc("change_entry_status", {
    p_entry_id: parsed.data.entryId,
    p_status: parsed.data.status,
    ...(parsed.data.changedOn ? { p_changed_on: parsed.data.changedOn } : {}),
  });
  if (error) {
    return error.message.includes("invalid_date")
      ? err("validation", "Choose a date that is not in the future.")
      : err("save_failed", "We could not change the status. Try again.");
  }
  if (!data || !isStatus(data)) {
    return err("not_found", "We could not find that game.");
  }
  return ok({ entryId: parsed.data.entryId, status: data });
}
