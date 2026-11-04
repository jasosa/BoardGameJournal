import { z } from "zod";
import { optionalDate } from "@/features/collection/schemas";
import { THOUGHT_TOPIC_KEYS, type ThoughtTopic } from "./topics";

export const THOUGHT_MAX_LENGTH = 10_000;

/** Length in characters as the database counts them (code points, not UTF-16 units). */
export function characterCount(text: string): number {
  return [...text].length;
}

export const thoughtBody = z
  .string({ error: "Write something before you save." })
  .trim()
  .min(1, "Write something before you save.")
  .refine(
    (value) => characterCount(value) <= THOUGHT_MAX_LENGTH,
    "This thought is too long. Keep it to 10,000 characters.",
  );

const topics = z
  .array(z.enum(THOUGHT_TOPIC_KEYS as [ThoughtTopic, ...ThoughtTopic[]]))
  .default([])
  .transform((list) => THOUGHT_TOPIC_KEYS.filter((key) => list.includes(key)));

export const addThoughtInput = z.object({
  gameId: z.uuid(),
  body: thoughtBody,
  topics,
  /** The date the thought was written (the person's local today). Blank means today. */
  writtenOn: optionalDate,
});

export type AddThoughtInput = z.infer<typeof addThoughtInput>;

export const updateThoughtInput = z.object({
  thoughtId: z.uuid(),
  body: thoughtBody,
  topics,
});

export type UpdateThoughtInput = z.infer<typeof updateThoughtInput>;

export const deleteThoughtInput = z.object({ thoughtId: z.uuid() });

/** One thought about a game. */
export type Thought = {
  id: string;
  gameId: string;
  /** Light Markdown, as written. */
  body: string;
  topics: ThoughtTopic[];
  /** YYYY-MM-DD, the date it was written. */
  writtenOn: string;
  createdAt: string;
};

/**
 * The message for a text that cannot be saved, or null. The form and the server use the same
 * schema, so they always agree.
 */
export function thoughtBodyProblem(text: string): string | null {
  const parsed = thoughtBody.safeParse(text);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? null);
}

/**
 * The date a new thought is written. The screen sends the person's own "today", which can be a
 * day ahead of or behind the server's date, so one day either way is accepted. Anything else
 * (a direct call trying to backdate a thought) becomes the server's today.
 */
export function acceptableWrittenOn(
  value: string,
  now: Date = new Date(),
): string {
  const today = now.toISOString().slice(0, 10);
  const day = 24 * 60 * 60 * 1000;
  const stamp = Date.parse(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(stamp)) return today;
  const gap = Math.abs(stamp - Date.parse(`${today}T00:00:00Z`));
  return gap <= day ? value : today;
}
