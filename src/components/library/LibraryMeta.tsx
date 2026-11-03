import Link from "next/link";
import { ViewSwitch } from "@/components/library/ViewSwitch";
import {
  LIBRARY_SORTS,
  PLAYER_OPTIONS,
  TIME_OPTIONS,
  buildLibraryHref,
  type LibraryParams,
  type LibrarySort,
} from "@/features/collection/library-query";

const SORT_LABEL: Record<LibrarySort, string> = {
  recent: "Recently added",
  title: "Title",
};

const metaLink =
  "text-ink-soft hover:text-ink focus-visible:outline-accent duration-fast inline-flex min-h-11 items-center border-b-2 border-transparent px-2 text-xs font-semibold tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=true]:border-ink aria-[current=true]:text-ink";

const optionLink =
  "text-ink-soft hover:text-ink focus-visible:outline-accent inline-flex min-h-11 min-w-11 items-center justify-center border-b-2 border-transparent px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=true]:border-ink aria-[current=true]:text-ink";

/**
 * The small row above the wall: how many games on the left; sort, view and "More filters" on
 * the right. Everything is a link to a URL, so the page needs no script for it. The extra
 * filters (players, play time) open in a small panel.
 */
export function LibraryMeta({
  params,
  count,
}: {
  params: LibraryParams;
  count: string;
}) {
  const hasMore = params.players !== null || params.time !== null;
  return (
    <div className="relative mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
      <p className="text-ink-soft text-xs font-semibold tracking-widest uppercase">
        {count}
      </p>
      <div className="flex flex-wrap items-center">
        <nav aria-label="Sort" className="flex">
          {LIBRARY_SORTS.map((sort) => (
            <Link
              key={sort}
              href={buildLibraryHref(params, { sort, page: 1 })}
              aria-current={params.sort === sort ? "true" : undefined}
              className={metaLink}
            >
              {SORT_LABEL[sort]}
            </Link>
          ))}
        </nav>
        <span
          aria-hidden="true"
          className="bg-line mx-2 hidden h-4 w-px sm:block"
        />
        <ViewSwitch params={params} />
        <span
          aria-hidden="true"
          className="bg-line mx-2 hidden h-4 w-px sm:block"
        />
        <details className="md:relative" open={hasMore}>
          <summary
            className={`${metaLink} cursor-pointer list-none`}
            aria-label={hasMore ? "More filters (in use)" : "More filters"}
          >
            More filters{hasMore ? " (on)" : ""}
          </summary>
          <div className="bg-raised rounded-card shadow-lift absolute inset-x-0 z-10 mt-1 flex flex-col gap-3 px-4 py-4 md:inset-x-auto md:right-0 md:w-max">
            <div>
              <p className="text-ink-soft text-xs font-semibold tracking-wider uppercase">
                Players
              </p>
              <div className="flex flex-wrap">
                <Link
                  href={buildLibraryHref(params, { players: null, page: 1 })}
                  aria-current={params.players === null ? "true" : undefined}
                  className={optionLink}
                >
                  Any
                </Link>
                {PLAYER_OPTIONS.map((n) => (
                  <Link
                    key={n}
                    href={buildLibraryHref(params, { players: n, page: 1 })}
                    aria-current={params.players === n ? "true" : undefined}
                    aria-label={n === 1 ? "1 player" : `${n} players`}
                    className={optionLink}
                  >
                    {n}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-ink-soft text-xs font-semibold tracking-wider uppercase">
                Play time
              </p>
              <div className="flex flex-wrap">
                <Link
                  href={buildLibraryHref(params, { time: null, page: 1 })}
                  aria-current={params.time === null ? "true" : undefined}
                  className={optionLink}
                >
                  Any
                </Link>
                {TIME_OPTIONS.map((n) => (
                  <Link
                    key={n}
                    href={buildLibraryHref(params, { time: n, page: 1 })}
                    aria-current={params.time === n ? "true" : undefined}
                    aria-label={`Up to ${n} minutes`}
                    className={optionLink}
                  >
                    {n} min
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
