import { z } from "zod";
import {
  COLLECTION_STATUSES,
  EARLIEST_CHANGE_DATE,
} from "@/features/collection/schemas";
import { THOUGHT_TOPIC_KEYS } from "@/features/thoughts/topics";

/**
 * The export file, version 1. One schema is shared by the export (output check), the check on
 * the device and the server import, so they always agree. Problems carry a short code in the
 * message (for example `year_range`), and `problems.ts` turns each code into the sentence the
 * person reads.
 */

export const EXPORT_FORMAT = "meeple-journal-export";
export const EXPORT_VERSION = 1;
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2_000;
const THOUGHT_MAX = 10_000;
const SMALLINT_MAX = 32_767;

/** Length in characters as the database counts them (code points). */
function chars(text: string): number {
  return [...text].length;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** Latest accepted date: tomorrow in UTC, as the database does (one day of time zone slack). */
function latestDate(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** A date in the range the database accepts. `code` names the problem when it is outside. */
function dateInRange(code: string) {
  return z
    .string({ error: code })
    .refine(
      (value) =>
        isRealDate(value) &&
        value >= EARLIEST_CHANGE_DATE &&
        value <= latestDate(),
      { message: code },
    );
}

const timestamp = z
  .string({ error: "timestamp_invalid" })
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "timestamp_invalid",
  });

const status = z.enum(COLLECTION_STATUSES, {
  error: (issue) => `status_invalid:${String(issue.input)}`,
});

const smallInt = z
  .number({ error: "players_invalid" })
  .int("players_invalid")
  .min(1, "players_invalid")
  .max(SMALLINT_MAX, "players_invalid");

const historyStep = z.object({
  from_status: status.nullable(),
  to_status: status,
  changed_on: dateInRange("history_date"),
  recorded_at: timestamp,
});

const copy = z
  .object({
    id: z.string().optional(),
    status,
    archived_at: timestamp.nullable(),
    acquired_on: z.string().nullable(),
    sold_on: z.string().nullable(),
    price: z.number().min(0).nullable(),
    currency: z.string().nullable(),
    source: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: timestamp,
    history: z.array(historyStep, { error: "no_history" }),
  })
  .superRefine((value, ctx) => {
    const steps = value.history;
    if (steps.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: "no_history",
      });
      return;
    }
    let previous: string | null = null;
    for (const step of steps) {
      if (step.from_status !== previous) {
        ctx.addIssue({
          code: "custom",
          path: ["history"],
          message: "history_chain",
        });
        return;
      }
      previous = step.to_status;
    }
    if (previous !== value.status) {
      ctx.addIssue({
        code: "custom",
        path: ["history"],
        message: `history_end:${value.status}`,
      });
    }
  });

const rating = z.object({
  overall: z
    .number({ error: "rating_range" })
    .min(0, "rating_range")
    .max(10, "rating_range")
    .refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9, {
      message: "rating_decimal",
    }),
  assessed_on: dateInRange("rating_date"),
  created_at: timestamp,
});

const topicList = z.array(z.string()).superRefine((topics, ctx) => {
  const seen = new Set<string>();
  topics.forEach((topic, index) => {
    if (!(THOUGHT_TOPIC_KEYS as readonly string[]).includes(topic)) {
      ctx.addIssue({
        code: "custom",
        path: [index],
        message: `topic_invalid:${topic}`,
      });
    } else if (seen.has(topic)) {
      ctx.addIssue({
        code: "custom",
        path: [index],
        message: `topic_duplicate:${topic}`,
      });
    }
    seen.add(topic);
  });
});

const thought = z.object({
  body: z
    .string({ error: "thought_empty" })
    .refine((value) => value.trim().length > 0, { message: "thought_empty" })
    .refine((value) => chars(value.trim()) <= THOUGHT_MAX, {
      message: "thought_long",
    }),
  topics: topicList,
  written_on: dateInRange("thought_date"),
  created_at: timestamp,
  updated_at: timestamp,
});

const game = z
  .object({
    id: z.string().optional(),
    name: z
      .string({ error: "title_missing" })
      .refine((value) => value.trim().length > 0, { message: "title_missing" })
      .refine((value) => chars(value.trim()) <= TITLE_MAX, {
        message: "title_long",
      }),
    year: z
      .number({ error: "year_range" })
      .int("year_range")
      .min(1, "year_range")
      .max(2200, "year_range")
      .nullable(),
    min_players: smallInt.nullable(),
    max_players: smallInt.nullable(),
    play_time_min: z
      .number({ error: "time_invalid" })
      .int("time_invalid")
      .min(1, "time_invalid")
      .max(SMALLINT_MAX, "time_invalid")
      .nullable(),
    description: z
      .string()
      .refine((value) => chars(value) <= DESCRIPTION_MAX, {
        message: "description_long",
      })
      .nullable(),
    kind: z.enum(["base", "expansion", "standalone_expansion"], {
      error: (issue) => `kind_invalid:${String(issue.input)}`,
    }),
    source: z.literal("manual"),
    created_at: timestamp,
    cover: z.unknown().optional(),
    copies: z.array(copy),
    ratings: z.array(rating),
    thoughts: z.array(thought),
  })
  .superRefine((value, ctx) => {
    const { min_players: min, max_players: max } = value;
    if (min !== null && max !== null && max < min) {
      ctx.addIssue({
        code: "custom",
        path: ["max_players"],
        message: "players_invalid",
      });
    }
  });

export const exportFileSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exported_at: timestamp,
  games: z.array(game),
});

export type ExportFile = z.infer<typeof exportFileSchema>;
export type ExportGame = ExportFile["games"][number];
export type ExportCopy = ExportGame["copies"][number];
