/** Small formatting helpers for the Your data section. No React, no Next. */

const NUMBER = new Intl.NumberFormat("en-GB");

/** 1204 -> "1,204". */
export function formatCount(value: number): string {
  return NUMBER.format(value);
}

/** "1 game", "2 games". The number uses the thousands separator. */
export function plural(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

/** Base 1024. Under 1 MB whole KB ("84 KB"), from 1 MB one decimal ("1.1 MB"). */
export function formatBytes(bytes: number): string {
  const MB = 1024 * 1024;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export type Counts = {
  games: number;
  copies: number;
  archived: number;
  changes: number;
  ratings: number;
  thoughts: number;
};

/**
 * The items of the counts line: games, copies (with "(n archived)" when n is more than 0),
 * status changes, ratings and thoughts. An item with 0 is left out.
 */
export function countItems(counts: Counts): string[] {
  const items: string[] = [];
  if (counts.games > 0) items.push(plural(counts.games, "game", "games"));
  if (counts.copies > 0) {
    const copies = plural(counts.copies, "copy", "copies");
    items.push(
      counts.archived > 0
        ? `${copies} (${formatCount(counts.archived)} archived)`
        : copies,
    );
  }
  if (counts.changes > 0) {
    items.push(plural(counts.changes, "status change", "status changes"));
  }
  if (counts.ratings > 0)
    items.push(plural(counts.ratings, "rating", "ratings"));
  if (counts.thoughts > 0) {
    items.push(plural(counts.thoughts, "thought", "thoughts"));
  }
  return items;
}

/** "This account now has 214 games, 231 copies, ..." with singular forms. */
export function importResultSentence(counts: Counts): string {
  return (
    `This account now has ${plural(counts.games, "game", "games")}, ` +
    `${plural(counts.copies, "copy", "copies")}, ` +
    `${plural(counts.changes, "status change", "status changes")}, ` +
    `${plural(counts.ratings, "rating", "ratings")} and ` +
    `${plural(counts.thoughts, "thought", "thoughts")}.`
  );
}

/** meeple-journal-YYYY-MM-DD.json, with the person's local date. */
export function exportFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `meeple-journal-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

/** "2 March 2026" for a calendar date (YYYY-MM-DD). No time zone shift. */
export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    ...LONG_DATE,
    timeZone: "UTC",
  });
}

/** "10 November 2026" for a timestamp, as a local date. */
export function formatLocalDay(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-GB", LONG_DATE);
}
