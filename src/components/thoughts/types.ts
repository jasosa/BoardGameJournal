import type { Thought } from "@/features/thoughts/schemas";

/** What the thought actions send back to the screen. */
export type SaveResult =
  | { ok: true; thought: Thought }
  | { ok: false; message: string; field?: "body" };

export type DeleteResult =
  { ok: true; thoughtId: string } | { ok: false; message: string };
