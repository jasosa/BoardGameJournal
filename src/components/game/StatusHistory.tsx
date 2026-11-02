import {
  HISTORY_LIMIT,
  describeChange,
  formatChangeDate,
  groupByEntry,
} from "@/features/collection/history";
import type { StatusChange } from "@/features/collection/schemas";

/** Every status change of the person's copies of one game, latest logged first. */
export function StatusHistory({
  entryIds,
  history,
}: {
  entryIds: string[];
  history: StatusChange[];
}) {
  const groups = groupByEntry(history);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink-soft -mt-1 text-sm">
        Listed in the order you recorded them. Each date is the one you gave.
      </p>
      {entryIds.map((entryId, index) => {
        const changes = groups.get(entryId) ?? [];
        if (changes.length === 0) return null;
        const shown = changes.slice(0, HISTORY_LIMIT);
        return (
          <div key={entryId}>
            {entryIds.length > 1 ? (
              <h3 className="text-ink-soft mb-2 text-sm">Copy {index + 1}</h3>
            ) : null}
            <ol className="flex flex-col gap-2">
              {shown.map((change) => (
                <li
                  key={change.id}
                  className="grid grid-cols-1 gap-x-4 text-sm sm:grid-cols-[9rem_1fr]"
                >
                  <time dateTime={change.changedOn} className="text-ink-soft">
                    {formatChangeDate(change.changedOn)}
                  </time>
                  <span>{describeChange(change)}</span>
                </li>
              ))}
            </ol>
            {changes.length > shown.length ? (
              <p className="text-ink-soft mt-2 text-sm">
                Showing the latest {HISTORY_LIMIT} of {changes.length}.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
