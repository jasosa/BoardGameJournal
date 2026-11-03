import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  PLAYER_OPTIONS,
  TIME_OPTIONS,
  hasActiveFilters,
  type LibraryParams,
} from "@/features/collection/library-query";
import {
  COLLECTION_STATUSES,
  STATUS_LABELS,
} from "@/features/collection/schemas";

const field =
  "border-line bg-paper text-ink rounded-input min-h-11 border px-3 text-base";

/**
 * Search, filters and sort as a plain GET form: the URL holds the state, and it works
 * without JavaScript. The view and the filters panel stay as they were when you search.
 */
export function LibraryControls({ params }: { params: LibraryParams }) {
  const activeCount =
    params.statuses.length +
    (params.players !== null ? 1 : 0) +
    (params.time !== null ? 1 : 0);
  const panelFilters =
    params.statuses.length > 0 ||
    params.players !== null ||
    params.time !== null;
  return (
    <form action="/library" method="get" className="mb-8 flex flex-col gap-4">
      {params.view !== "gallery" ? (
        <input type="hidden" name="view" value={params.view} />
      ) : null}

      <div className="flex gap-2">
        <label className="sr-only" htmlFor="library-search">
          Search your games
        </label>
        <input
          id="library-search"
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Search your games"
          maxLength={100}
          autoComplete="off"
          className={`${field} min-w-0 flex-1`}
        />
        <Button type="submit" variant="quiet">
          Search
        </Button>
      </div>

      <details open={panelFilters} className="group">
        <summary className="text-ink-soft rounded-input px-1 hover:text-ink focus-visible:outline-bronze inline-flex min-h-11 cursor-pointer items-center text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
          <span
            aria-hidden="true"
            className="duration-fast mr-2 inline-block transition-transform group-open:rotate-90"
          >
            ›
          </span>
          Filters and sort{activeCount > 0 ? ` (${activeCount})` : ""}
        </summary>
        <div className="mt-2 flex flex-col gap-5">
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Status</legend>
            <div className="flex flex-wrap gap-2">
              {COLLECTION_STATUSES.map((status) => (
                <label key={status} className="relative">
                  <input
                    type="checkbox"
                    name="status"
                    value={status}
                    defaultChecked={params.statuses.includes(status)}
                    className="peer absolute inset-0 opacity-0"
                  />
                  <span className="border-line text-ink-soft peer-checked:border-ink peer-checked:bg-cream peer-checked:text-ink peer-focus-visible:outline-bronze duration-fast rounded-input inline-flex min-h-11 items-center border px-4 text-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                    {STATUS_LABELS[status]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="library-players" className="text-sm font-medium">
                Players
              </label>
              <select
                id="library-players"
                name="players"
                defaultValue={params.players ?? ""}
                className={field}
              >
                <option value="">Any number</option>
                {PLAYER_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "1 player" : `${n} players`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="library-time" className="text-sm font-medium">
                Play time
              </label>
              <select
                id="library-time"
                name="time"
                defaultValue={params.time ?? ""}
                className={field}
              >
                <option value="">Any length</option>
                {TIME_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    Up to {n} min
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="library-sort" className="text-sm font-medium">
                Sort
              </label>
              <select
                id="library-sort"
                name="sort"
                defaultValue={params.sort}
                className={field}
              >
                <option value="recent">Recently added</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="quiet">
              Apply
            </Button>
            {hasActiveFilters(params) ? (
              <Link
                href={
                  params.view === "gallery"
                    ? "/library"
                    : `/library?view=${params.view}`
                }
                className="text-ink inline-flex min-h-11 items-center text-sm underline underline-offset-4"
              >
                Clear filters
              </Link>
            ) : null}
          </div>
        </div>
      </details>
    </form>
  );
}
