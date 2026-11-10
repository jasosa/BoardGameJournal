import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildExportData, type ExportRows } from "@/features/export/build";
import { checkExportFile } from "@/features/export/check-file";
import type { Counts } from "@/features/export/format";
import { exportFileSchema } from "@/features/export/schemas";
import type { Database } from "@/lib/database/types";
import { err, ok, type Result } from "@/lib/result";

type Client = SupabaseClient<Database>;

/** The API returns at most this many rows per request, so reads go page by page. */
const PAGE = 1000;

type Page<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

async function readAll<T>(page: (from: number, to: number) => Page<T>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error || !data) return null;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function countOf(
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number | null> {
  const { count, error } = await query;
  return error || count === null ? null : count;
}

export type DataSummary = Counts & {
  /** True when nothing would be exported and an import is allowed. */
  empty: boolean;
};

/**
 * Counts for the Your data section, for the signed-in person (row security does the filtering).
 * "Empty account" means no games they created, no copies (archived too), no ratings, no thoughts.
 */
export async function getDataSummary(
  supabase: Client,
  userId: string,
): Promise<Result<DataSummary>> {
  const head = { count: "exact", head: true } as const;
  const [games, copies, archived, changes, ratings, thoughts] =
    await Promise.all([
      countOf(
        supabase.from("games").select("id", head).eq("created_by", userId),
      ),
      countOf(
        supabase
          .from("collection_entries")
          .select("id", head)
          .eq("user_id", userId),
      ),
      countOf(
        supabase
          .from("collection_entries")
          .select("id", head)
          .eq("user_id", userId)
          .not("archived_at", "is", null),
      ),
      countOf(
        supabase
          .from("collection_status_changes")
          .select("id", head)
          .eq("user_id", userId),
      ),
      countOf(
        supabase.from("assessments").select("id", head).eq("user_id", userId),
      ),
      countOf(
        supabase
          .from("journal_entries")
          .select("id", head)
          .eq("user_id", userId),
      ),
    ]);
  if (
    games === null ||
    copies === null ||
    archived === null ||
    changes === null ||
    ratings === null ||
    thoughts === null
  ) {
    return err("read_failed", "Could not read your data just now.");
  }
  return ok({
    games,
    copies,
    archived,
    changes,
    ratings,
    thoughts,
    empty: games + copies + ratings + thoughts === 0,
  });
}

/**
 * Builds the export file for the signed-in person: one JSON text, two-space indent. Everything
 * is read under row security. Version 1 holds the person's own manual games only, so a record
 * that points at any other game stops the export instead of leaving a hole in the file.
 */
export async function buildExport(
  supabase: Client,
  userId: string,
  now: Date = new Date(),
): Promise<Result<{ text: string }>> {
  const failed = err(
    "export_failed",
    "Could not prepare your export. Nothing was downloaded. Try again.",
  );

  const games = await readAll((from, to) =>
    supabase
      .from("games")
      .select(
        "id, name, year, min_players, max_players, play_time_min, description, kind, source, created_at",
      )
      .eq("created_by", userId)
      .order("created_at")
      .order("name")
      .order("id")
      .range(from, to),
  );
  const covers: {
    game_id: string;
    storage_path: string | null;
    width: number | null;
    height: number | null;
    dominant_color: string | null;
    accent_color: string | null;
  }[] = [];
  if (games) {
    for (let at = 0; at < games.length; at += 100) {
      const { data, error } = await supabase
        .from("game_images")
        .select(
          "game_id, storage_path, width, height, dominant_color, accent_color",
        )
        .eq("kind", "cover")
        .in(
          "game_id",
          games.slice(at, at + 100).map((g) => g.id),
        );
      if (error || !data) return failed;
      covers.push(...data);
    }
  }
  const entries = await readAll((from, to) =>
    supabase
      .from("collection_entries")
      .select(
        "id, game_id, status, archived_at, acquired_on, sold_on, price, currency, source, notes, created_at",
      )
      .eq("user_id", userId)
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  const changes = await readAll((from, to) =>
    supabase
      .from("collection_status_changes")
      .select("entry_id, from_status, to_status, changed_on, recorded_at")
      .eq("user_id", userId)
      .order("recorded_at")
      .order("id")
      .range(from, to),
  );
  const ratings = await readAll((from, to) =>
    supabase
      .from("assessments")
      .select("game_id, overall, assessed_on, created_at")
      .eq("user_id", userId)
      .order("assessed_on")
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  const thoughts = await readAll((from, to) =>
    supabase
      .from("journal_entries")
      .select("game_id, body, topics, written_on, created_at, updated_at")
      .eq("user_id", userId)
      .order("written_on")
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  if (!games || !entries || !changes || !ratings || !thoughts) {
    return failed;
  }

  const own = new Set(games.map((g) => g.id));
  const strays =
    entries.some((e) => !own.has(e.game_id)) ||
    ratings.some((r) => !own.has(r.game_id)) ||
    thoughts.some((t) => !own.has(t.game_id));
  if (strays) return failed;

  const rows: ExportRows = {
    games,
    covers,
    entries,
    changes,
    ratings,
    thoughts,
  };
  const data = buildExportData(rows, now.toISOString());
  // The file must pass the same check the import runs, or it would not round-trip.
  if (!exportFileSchema.safeParse(data).success) return failed;
  return ok({ text: JSON.stringify(data, null, 2) });
}

export type ImportError = {
  code: "not_empty" | "refused" | "failed";
  message: string;
};

const MESSAGES: Record<ImportError["code"], string> = {
  not_empty:
    "Something was added to this account after you chose the file, so nothing was imported. Import works only into an empty account.",
  refused:
    "The file did not pass the check on the server, so nothing was saved. Choose the file again, or export it again.",
  failed:
    "The import did not finish, and nothing was saved. Your file is fine. Try again.",
};

function importFailure(code: ImportError["code"]): Result<never> {
  return err(code, MESSAGES[code]);
}

const importCounts = z.object({
  games: z.number(),
  copies: z.number(),
  archived: z.number(),
  changes: z.number(),
  ratings: z.number(),
  thoughts: z.number(),
});

/**
 * Puts an export file into the signed-in person's empty account. The server checks the file
 * again with the shared schema (the device check is a convenience), then one database function
 * checks the account is still empty and writes everything in one transaction.
 */
export async function importAccount(
  supabase: Client,
  text: string,
): Promise<Result<Counts>> {
  const size = new TextEncoder().encode(text).length;
  const checked = checkExportFile(size, text);
  if (checked.kind !== "ok") {
    // The screen already showed why. Here it is a plain refusal.
    return importFailure("refused");
  }

  const { data, error } = await supabase.rpc("import_account", {
    p_data: checked.file as unknown as never,
  });
  if (error) {
    if (error.message.includes("account_not_empty")) {
      return importFailure("not_empty");
    }
    // Data and constraint errors (classes 22 and 23): the file was refused, nothing was saved.
    if (/^2[23]/.test(error.code)) return importFailure("refused");
    return importFailure("failed");
  }
  const counts = importCounts.safeParse(data);
  if (!counts.success) return importFailure("failed");
  return ok(counts.data);
}
