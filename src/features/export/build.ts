import { EXPORT_FORMAT, EXPORT_VERSION, type ExportFile } from "./schemas";

/** Rows as the database returns them, for one person. */
export type ExportRows = {
  games: {
    id: string;
    name: string;
    year: number | null;
    min_players: number | null;
    max_players: number | null;
    play_time_min: number | null;
    description: string | null;
    kind: string;
    source: string;
    created_at: string;
  }[];
  covers: {
    game_id: string;
    storage_path: string | null;
    width: number | null;
    height: number | null;
    dominant_color: string | null;
    accent_color: string | null;
  }[];
  entries: {
    id: string;
    game_id: string;
    status: string;
    archived_at: string | null;
    acquired_on: string | null;
    sold_on: string | null;
    price: number | null;
    currency: string | null;
    source: string | null;
    notes: string | null;
    created_at: string;
  }[];
  changes: {
    entry_id: string;
    from_status: string | null;
    to_status: string;
    changed_on: string;
    recorded_at: string;
  }[];
  ratings: {
    game_id: string;
    overall: number;
    assessed_on: string;
    created_at: string;
  }[];
  thoughts: {
    game_id: string;
    body: string;
    topics: string[];
    written_on: string;
    created_at: string;
    updated_at: string;
  }[];
};

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const list = groups.get(key(item));
    if (list) list.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

/**
 * Builds the version 1 file from rows. Rows must already be in a stable order (the service
 * sorts them). Values are passed through as stored, and the shared schema checks the result.
 * Returned loosely typed on purpose: the caller validates it with `exportFileSchema`.
 */
export function buildExportData(rows: ExportRows, exportedAt: string) {
  const covers = new Map(rows.covers.map((c) => [c.game_id, c]));
  const entries = groupBy(rows.entries, (e) => e.game_id);
  const changes = groupBy(rows.changes, (c) => c.entry_id);
  const ratings = groupBy(rows.ratings, (r) => r.game_id);
  const thoughts = groupBy(rows.thoughts, (t) => t.game_id);

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: exportedAt,
    games: rows.games.map((game) => {
      const cover = covers.get(game.id);
      return {
        id: game.id,
        name: game.name,
        year: game.year,
        min_players: game.min_players,
        max_players: game.max_players,
        play_time_min: game.play_time_min,
        description: game.description,
        kind: game.kind,
        source: game.source,
        created_at: game.created_at,
        cover:
          cover && cover.storage_path
            ? {
                path: cover.storage_path,
                width: cover.width,
                height: cover.height,
                dominant_color: cover.dominant_color,
                accent_color: cover.accent_color,
              }
            : null,
        copies: (entries.get(game.id) ?? []).map((entry) => ({
          id: entry.id,
          status: entry.status,
          archived_at: entry.archived_at,
          acquired_on: entry.acquired_on,
          sold_on: entry.sold_on,
          price: entry.price,
          currency: entry.currency,
          source: entry.source,
          notes: entry.notes,
          created_at: entry.created_at,
          history: (changes.get(entry.id) ?? []).map((change) => ({
            from_status: change.from_status,
            to_status: change.to_status,
            changed_on: change.changed_on,
            recorded_at: change.recorded_at,
          })),
        })),
        ratings: (ratings.get(game.id) ?? []).map((rating) => ({
          overall: rating.overall,
          assessed_on: rating.assessed_on,
          created_at: rating.created_at,
        })),
        thoughts: (thoughts.get(game.id) ?? []).map((thought) => ({
          body: thought.body,
          topics: thought.topics,
          written_on: thought.written_on,
          created_at: thought.created_at,
          updated_at: thought.updated_at,
        })),
      };
    }),
  } satisfies Record<string, unknown> as unknown as ExportFile;
}
