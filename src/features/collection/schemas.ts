import { z } from "zod";
import type { CoverRef } from "@/features/catalogue/cover";

/** Values match the check constraint on collection_entries.status. */
export const COLLECTION_STATUSES = [
  "owned",
  "wishlist",
  "interested",
  "previously_owned",
] as const;

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  owned: "Owned",
  wishlist: "Wishlist",
  interested: "Interested",
  previously_owned: "Previously owned",
};

export const TITLE_MAX_LENGTH = 200;

export const EARLIEST_CHANGE_DATE = "1900-01-01";

/** A real calendar date written as YYYY-MM-DD. */
function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** Latest date a change can have: tomorrow in UTC, which leaves room for time zones. */
function latestChangeDate(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** A date the person gives for something that happened. Blank means today. */
const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .refine(isRealDate, "Enter a real date.")
    .refine(
      (value) => value >= EARLIEST_CHANGE_DATE,
      "Choose a date after 1900.",
    )
    .refine(
      (value) => value <= latestChangeDate(),
      "Choose a date that is not in the future.",
    )
    .optional(),
);

export const addManualGameInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(TITLE_MAX_LENGTH, `Use ${TITLE_MAX_LENGTH} characters or fewer.`),
  status: z.enum(COLLECTION_STATUSES, { error: "Choose a status." }),
  /** The date the game was added (the person's local today). Blank means today. */
  addedOn: optionalDate,
});

export type AddManualGameInput = z.infer<typeof addManualGameInput>;

/** Another copy of a game that already exists (one the person already has, or a provider's). */
export const addGameCopyInput = z.object({
  gameId: z.uuid(),
  status: z.enum(COLLECTION_STATUSES, { error: "Choose a status." }),
  addedOn: optionalDate,
});

export type AddGameCopyInput = z.infer<typeof addGameCopyInput>;

/** A game in the person's collection whose title matches what they typed. */
export type TitleMatch = {
  gameId: string;
  title: string;
  /** Status of the most recently added copy. */
  status: CollectionStatus;
};

export const changeEntryStatusInput = z.object({
  entryId: z.uuid(),
  status: z.enum(COLLECTION_STATUSES, { error: "Choose a status." }),
  changedOn: optionalDate,
});

export type ChangeEntryStatusInput = z.infer<typeof changeEntryStatusInput>;

export type LibraryItem = {
  entryId: string;
  gameId: string;
  title: string;
  status: CollectionStatus;
  cover: CoverRef | null;
};

/** One row of a copy's history. `from` is null for the first row. */
export type StatusChange = {
  id: string;
  entryId: string;
  from: CollectionStatus | null;
  to: CollectionStatus;
  /** YYYY-MM-DD, the date the person says it happened. */
  changedOn: string;
  recordedAt: string;
};
