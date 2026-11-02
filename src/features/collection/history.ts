import {
  STATUS_LABELS,
  type StatusChange,
} from "@/features/collection/schemas";

/** How many changes are listed per copy on the game page. */
export const HISTORY_LIMIT = 20;

/** "Added as Wishlist" for the first row, "Wishlist → Owned" for a change. */
export function describeChange(
  change: Pick<StatusChange, "from" | "to">,
): string {
  if (change.from === null) return `Added as ${STATUS_LABELS[change.to]}`;
  return `${STATUS_LABELS[change.from]} → ${STATUS_LABELS[change.to]}`;
}

/** "1 June 2019". The value is a plain date, so no time zone shifts it. */
export function formatChangeDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** Groups changes by copy, keeping the order they came in. */
export function groupByEntry(
  changes: StatusChange[],
): Map<string, StatusChange[]> {
  const groups = new Map<string, StatusChange[]>();
  for (const change of changes) {
    const list = groups.get(change.entryId) ?? [];
    list.push(change);
    groups.set(change.entryId, list);
  }
  return groups;
}
