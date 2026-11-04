import { z } from "zod";
import { optionalDate } from "@/features/collection/schemas";

const NUMBER_MESSAGE = "Use a number from 0 to 10, with one decimal at most.";

/** "8", "8.5" or "8,5": a number from 0 to 10 with at most one decimal. */
const decimalText = z
  .string()
  .trim()
  .regex(/^\d{1,2}([.,]\d)?$/, NUMBER_MESSAGE)
  .transform((value) => Number(value.replace(",", ".")))
  .refine((value) => value >= 0 && value <= 10, NUMBER_MESSAGE);

export const addAssessmentInput = z.object({
  gameId: z.uuid(),
  overall: z
    .string({ error: "Enter a rating from 0 to 10." })
    .trim()
    .min(1, "Enter a rating from 0 to 10.")
    .pipe(decimalText),
  /** The date of the opinion (the person's local today). Blank means today. */
  assessedOn: optionalDate,
});

export type AddAssessmentInput = z.infer<typeof addAssessmentInput>;

/** One rating of a game on a date. A new opinion is a new row, never an edit. */
export type Assessment = {
  id: string;
  gameId: string;
  /** YYYY-MM-DD, the date of the opinion. */
  assessedOn: string;
  overall: number;
  createdAt: string;
};
