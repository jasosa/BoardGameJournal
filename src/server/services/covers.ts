import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { COVER_MAX_BYTES, coverPaths } from "@/features/catalogue/cover";
import type { Database } from "@/lib/database/types";
import { err, ok, type Result } from "@/lib/result";
import { processCover } from "@/server/images/process-cover";
import { getGameDossier } from "./games";

type Client = SupabaseClient<Database>;

const BUCKET = "covers";

async function removeObjects(supabase: Client, paths: string[]) {
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
}

/** Both files of a cover, given the stored path of the cover file. */
function filesOf(storagePath: string): string[] {
  const dir = storagePath.replace(/\/[^/]+$/, "");
  return [`${dir}/cover.webp`, `${dir}/thumb.webp`];
}

/**
 * Sets the cover of a game from an uploaded file. Only the person's own manual games can have
 * one. The image is checked and resized first. The new files are stored before the database
 * row changes, and the old files are removed last, so a failure never leaves the game without
 * a cover and never leaves stray files behind.
 */
export async function uploadCover(
  supabase: Client,
  userId: string,
  input: { gameId: string; file: File },
): Promise<Result<{ imageId: string }>> {
  const dossier = await getGameDossier(supabase, userId, input.gameId);
  if (!dossier.ok || !dossier.data.game.editable) {
    return err("not_found", "We could not find that game.");
  }

  if (input.file.size === 0) {
    return err("no_file", "Choose an image first.");
  }
  if (input.file.size > COVER_MAX_BYTES) {
    return err("too_large", "That image is larger than 10 MB.");
  }

  const processed = await processCover(
    new Uint8Array(await input.file.arrayBuffer()),
  );
  if (!processed.ok) return processed;

  const paths = coverPaths(userId, input.gameId, randomUUID());
  const storage = supabase.storage.from(BUCKET);
  const [coverUpload, thumbUpload] = await Promise.all([
    storage.upload(paths.cover, processed.data.cover, {
      contentType: "image/webp",
    }),
    storage.upload(paths.thumb, processed.data.thumb, {
      contentType: "image/webp",
    }),
  ]);
  if (coverUpload.error || thumbUpload.error) {
    await removeObjects(supabase, [paths.cover, paths.thumb]);
    return err("save_failed", "We could not save the cover. Try again.");
  }

  const { data: previous } = await supabase
    .from("game_images")
    .select("id, storage_path")
    .eq("game_id", input.gameId)
    .eq("kind", "cover")
    .maybeSingle();

  const fields = {
    storage_path: paths.cover,
    width: 900,
    height: 1200,
    licence: "own-upload",
    attribution: null,
    dominant_color: processed.data.colours.tint,
    accent_color: processed.data.colours.glow,
  };
  // Replacing only succeeds if the row still points at the files we read. If someone else
  // replaced the cover in the meantime, we back out instead of overwriting their files'
  // record, which would leave their files behind with nothing pointing at them.
  let saved: { id: string } | null = null;
  let failed = false;
  if (previous) {
    const update = supabase
      .from("game_images")
      .update(fields)
      .eq("id", previous.id);
    const { data, error } = await (
      previous.storage_path === null
        ? update.is("storage_path", null)
        : update.eq("storage_path", previous.storage_path)
    )
      .select("id")
      .maybeSingle();
    failed = Boolean(error);
    saved = data;
  } else {
    const { data, error } = await supabase
      .from("game_images")
      .insert({ game_id: input.gameId, kind: "cover", ...fields })
      .select("id")
      .single();
    failed = Boolean(error);
    saved = data;
  }

  if (failed || !saved) {
    await removeObjects(supabase, [paths.cover, paths.thumb]);
    return err(
      failed ? "save_failed" : "conflict",
      failed
        ? "We could not save the cover. Try again."
        : "The cover was changed at the same moment. Try again.",
    );
  }

  if (previous?.storage_path) {
    await removeObjects(supabase, filesOf(previous.storage_path));
  }
  return ok({ imageId: saved.id });
}

/** Removes the cover of one of the person's own games. */
export async function removeCover(
  supabase: Client,
  userId: string,
  gameId: string,
): Promise<Result<null>> {
  const dossier = await getGameDossier(supabase, userId, gameId);
  if (!dossier.ok || !dossier.data.game.editable) {
    return err("not_found", "We could not find that game.");
  }

  const { data: row } = await supabase
    .from("game_images")
    .select("id, storage_path")
    .eq("game_id", gameId)
    .eq("kind", "cover")
    .maybeSingle();
  if (!row) return ok(null);

  const { error } = await supabase
    .from("game_images")
    .delete()
    .eq("id", row.id);
  if (error)
    return err("save_failed", "We could not remove the cover. Try again.");

  if (row.storage_path)
    await removeObjects(supabase, filesOf(row.storage_path));
  return ok(null);
}
