import { z } from "zod";

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

export const addManualGameInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(TITLE_MAX_LENGTH, `Use ${TITLE_MAX_LENGTH} characters or fewer.`),
  status: z.enum(COLLECTION_STATUSES, { error: "Choose a status." }),
});

export type AddManualGameInput = z.infer<typeof addManualGameInput>;

export type LibraryItem = {
  entryId: string;
  gameId: string;
  title: string;
  status: CollectionStatus;
};
