import { formatChangeDate } from "@/features/collection/history";
import type { Assessment } from "./schemas";

/** How many assessments the game page reads. */
export const ASSESSMENT_LIMIT = 200;

/** "8" for a whole number, "8.5" otherwise. */
export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const formatAssessmentDate = formatChangeDate;

/**
 * The current rating is the latest assessment: the newest date, and for the same date the one
 * logged last. `assessments` may come in any order.
 */
export function currentAssessment(
  assessments: Assessment[],
): Assessment | null {
  let best: Assessment | null = null;
  for (const item of assessments) {
    if (
      best === null ||
      item.assessedOn > best.assessedOn ||
      (item.assessedOn === best.assessedOn && item.createdAt > best.createdAt)
    ) {
      best = item;
    }
  }
  return best;
}

/** Latest first, the same order as `currentAssessment`. */
export function sortLatestFirst(assessments: Assessment[]): Assessment[] {
  return [...assessments].sort((a, b) =>
    a.assessedOn === b.assessedOn
      ? b.createdAt.localeCompare(a.createdAt)
      : b.assessedOn.localeCompare(a.assessedOn),
  );
}
