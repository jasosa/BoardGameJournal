import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLECTION_STATUSES,
  addManualGameInput,
  changeEntryStatusInput,
  type CollectionStatus,
  type LibraryItem,
} from "@/features/collection/schemas";
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
  });
  if (error || !data) {
    return err("save_failed", "We could not save the game. Try again.");
  }
  return ok({ entryId: data });
}

function isStatus(value: string): value is CollectionStatus {
  return (COLLECTION_STATUSES as readonly string[]).includes(value);
}

/** The signed-in user's collection, newest first. RLS limits rows to the caller. */
export async function listLibrary(
  supabase: Client,
): Promise<Result<LibraryItem[]>> {
  const { data, error } = await supabase
    .from("collection_entries")
    .select(
      "id, status, game_id, games(name, game_images(id, storage_path, kind))",
    )
    .order("created_at", { ascending: false });
  if (error) {
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
    });
  }
  return ok(items);
}

/**
 * Moves one collection entry to another status. Only the current status is stored for now;
 * a dated status history comes with L3. RLS limits the update to the caller's own entries.
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

  const { data, error } = await supabase
    .from("collection_entries")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.entryId)
    .select("id, status");
  if (error) {
    return err("save_failed", "We could not change the status. Try again.");
  }
  const row = data[0];
  if (!row || !isStatus(row.status)) {
    return err("not_found", "We could not find that game.");
  }
  return ok({ entryId: row.id, status: row.status });
}
