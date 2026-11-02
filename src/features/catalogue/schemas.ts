import { z } from "zod";

export const YEAR_MAX = 2200;
export const DESCRIPTION_MAX_LENGTH = 2000;

/** Form fields arrive as strings. A blank field means "not known", which is null. */
const optionalInt = (label: string, min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    },
    z
      .string()
      .regex(/^\d+$/, `${label} must be a whole number.`)
      .transform(Number)
      .pipe(
        z
          .number()
          .min(min, `${label} must be at least ${min}.`)
          .max(max, `${label} must be ${max} or less.`),
      )
      .nullable(),
  );

export const updateGameFactsInput = z
  .object({
    gameId: z.uuid(),
    year: optionalInt("Year", 1, YEAR_MAX),
    minPlayers: optionalInt("Minimum players", 1, 99),
    maxPlayers: optionalInt("Maximum players", 1, 99),
    playTimeMin: optionalInt("Play time", 1, 1440),
    description: z.preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      },
      z
        .string()
        .max(
          DESCRIPTION_MAX_LENGTH,
          `Use ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
        )
        .nullable(),
    ),
  })
  .refine(
    (facts) =>
      facts.minPlayers === null ||
      facts.maxPlayers === null ||
      facts.maxPlayers >= facts.minPlayers,
    {
      path: ["maxPlayers"],
      message: "Maximum players cannot be less than the minimum.",
    },
  );

export type UpdateGameFactsInput = z.infer<typeof updateGameFactsInput>;

/** A game as the person sees it, with the facts they can edit. */
export type GameDetails = {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  /** True when the signed-in person created this record and may edit it. */
  editable: boolean;
  description: string | null;
  year: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMin: number | null;
};
