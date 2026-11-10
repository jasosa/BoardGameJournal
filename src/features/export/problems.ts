import type { z } from "zod";
import { formatDay } from "./format";

/** How many problems the person sees before "and n more". */
export const MAX_PROBLEMS_SHOWN = 5;

type Path = ReadonlyArray<string | number>;

function at(raw: unknown, path: Path): unknown {
  let value: unknown = raw;
  for (const key of path) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<string | number, unknown>)[key];
  }
  return value;
}

/** Names a game by its title in curly quotes, or by position when the title is missing. */
function gameLabel(raw: unknown, index: number): string {
  const name = at(raw, ["games", index, "name"]);
  return typeof name === "string" && name.trim() !== ""
    ? `Game “${name.trim()}”`
    : `Game ${index + 1}`;
}

function dateOf(raw: unknown, path: Path, field: string): string | null {
  const value = at(raw, [...path, field]);
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? formatDay(value)
    : null;
}

function words(status: string): string {
  return status.replaceAll("_", " ");
}

/** The sentence after the place, or null when the code is not one we know. */
function sentence(code: string, arg: string, rating: unknown): string | null {
  switch (code) {
    case "title_missing":
      return "the title is missing.";
    case "title_long":
      return "the title is longer than 200 characters.";
    case "year_range":
      return "the year is outside 1 to 2200.";
    case "players_invalid":
      return "the player counts are not valid.";
    case "time_invalid":
      return "the play time is not valid.";
    case "description_long":
      return "the description is longer than 2,000 characters.";
    case "kind_invalid":
      return `kind “${arg}” is not one of base, expansion, standalone expansion.`;
    case "status_invalid":
      return `status “${arg}” is not one of owned, wishlist, interested, previously owned.`;
    case "no_history":
      return "it has no status history.";
    case "history_end":
      return `its history does not end in its status (${words(arg)}).`;
    case "history_date":
      return "a status change date is outside 1900 to today.";
    case "rating_range":
      return `rating ${String(rating)} is outside 0 to 10.`;
    case "rating_decimal":
      return "ratings have at most one decimal.";
    case "rating_date":
    case "thought_date":
      return "the date is outside 1900 to today.";
    case "thought_empty":
      return "the text is empty.";
    case "thought_long":
      return "the text is longer than 10,000 characters.";
    case "topic_invalid":
      return `topic “${arg}” is not one of the nine topics.`;
    case "topic_duplicate":
      return `topic “${arg}” is listed twice.`;
    default:
      return null;
  }
}

/** One readable line for one schema issue. `raw` is the file as it was read. */
export function describeIssue(issue: z.core.$ZodIssue, raw: unknown): string {
  const path = issue.path as Path;
  const [code = "", ...rest] = issue.message.split(":");
  const arg = rest.join(":");

  if (path[0] !== "games" || typeof path[1] !== "number") {
    return `The file: ${path.join(".") || "the content"} is not valid.`;
  }
  const gi = path[1];
  const game = gameLabel(raw, gi);

  // Title problems read "Game 3: the title is missing." when there is no title to quote.
  const part = path[2];
  const index = path[3];
  let place = game;
  let ratingValue: unknown;
  if (part === "copies" && typeof index === "number") {
    place = `${game}, copy ${index + 1}`;
  } else if (part === "ratings" && typeof index === "number") {
    const date = dateOf(raw, ["games", gi, "ratings", index], "assessed_on");
    place = `${game}, rating from ${date ?? index + 1}`;
    ratingValue = at(raw, ["games", gi, "ratings", index, "overall"]);
  } else if (part === "thoughts" && typeof index === "number") {
    const date = dateOf(raw, ["games", gi, "thoughts", index], "written_on");
    place = `${game}, thought from ${date ?? index + 1}`;
  }

  const text = sentence(code, arg, ratingValue);
  if (text !== null) return `${place}: ${text}`;

  const field = path.slice(2).join(".");
  return `${game}: ${field || "the game"} is not valid.`;
}

export type Problems = {
  total: number;
  /** The first five, in file order. */
  shown: string[];
  /** How many more there are. */
  more: number;
};

/** The problems of a refused file, in file order, limited to five lines. */
export function describeProblems(error: z.ZodError, raw: unknown): Problems {
  const lines = error.issues.map((issue) => describeIssue(issue, raw));
  return {
    total: lines.length,
    shown: lines.slice(0, MAX_PROBLEMS_SHOWN),
    more: Math.max(0, lines.length - MAX_PROBLEMS_SHOWN),
  };
}
