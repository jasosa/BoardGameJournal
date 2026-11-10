import type { Counts } from "./format";
import type { ExportFile } from "./schemas";

export type FileSummary = Counts & {
  /** Games that had a cover when the file was made. */
  covers: number;
};

/** What a valid file holds, for the "Ready to import" panel. */
export function summarizeFile(file: ExportFile): FileSummary {
  const summary: FileSummary = {
    games: file.games.length,
    copies: 0,
    archived: 0,
    changes: 0,
    ratings: 0,
    thoughts: 0,
    covers: 0,
  };
  for (const game of file.games) {
    if (game.cover) summary.covers += 1;
    summary.copies += game.copies.length;
    summary.ratings += game.ratings.length;
    summary.thoughts += game.thoughts.length;
    for (const copy of game.copies) {
      if (copy.archived_at !== null) summary.archived += 1;
      summary.changes += copy.history.length;
    }
  }
  return summary;
}
