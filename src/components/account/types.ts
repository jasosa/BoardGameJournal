import type { Counts } from "@/features/export/format";

/** What the import action returns to the screen. */
export type ImportResult =
  | { ok: true; counts: Counts }
  | { ok: false; code: "not_empty" | "refused" | "failed"; message: string };
