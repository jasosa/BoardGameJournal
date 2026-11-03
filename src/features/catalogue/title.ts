/**
 * A title reduced to what makes two spellings the same game: accents, case, spacing and
 * punctuation are ignored. "Catan: Seafarers" is still different from "Catan".
 * Used to spot a game the person already has, and later to match provider results (L2).
 */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
