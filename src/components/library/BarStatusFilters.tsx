"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  buildLibraryHref,
  parseLibraryParams,
  rawFromSearchParams,
} from "@/features/collection/library-query";
import {
  COLLECTION_STATUSES,
  STATUS_LABELS,
  type CollectionStatus,
} from "@/features/collection/schemas";

/** Shorter words for the bar; the full name stays as the accessible name. */
const SHORT: Record<CollectionStatus, string> = {
  owned: "Owned",
  wishlist: "Wishlist",
  interested: "Interested",
  previously_owned: "Previously",
};

const link =
  "text-ink-soft hover:text-ink focus-visible:outline-accent duration-fast inline-flex min-h-11 min-w-11 items-center justify-center border-b-2 border-transparent px-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=true]:border-ink aria-[current=true]:text-ink";

/**
 * Status filters as quiet text links, the current ones underlined. "All" clears them; each other
 * link switches its status on or off, so several can be on. Only shown on the Library.
 */
export function BarStatusFilters({ className = "" }: { className?: string }) {
  const onLibrary = usePathname() === "/library";
  const params = parseLibraryParams(rawFromSearchParams(useSearchParams()));
  if (!onLibrary) return null;

  function toggled(status: CollectionStatus): CollectionStatus[] {
    return params.statuses.includes(status)
      ? params.statuses.filter((s) => s !== status)
      : [...params.statuses, status];
  }

  return (
    <nav aria-label="Status filter" className={className}>
      <ul className="flex flex-wrap">
        <li>
          <Link
            href={buildLibraryHref(params, { statuses: [], page: 1 })}
            aria-current={params.statuses.length === 0 ? "true" : undefined}
            className={link}
          >
            All
          </Link>
        </li>
        {COLLECTION_STATUSES.map((status) => (
          <li key={status}>
            <Link
              href={buildLibraryHref(params, {
                statuses: toggled(status),
                page: 1,
              })}
              aria-current={
                params.statuses.includes(status) ? "true" : undefined
              }
              aria-label={STATUS_LABELS[status]}
              className={link}
            >
              {SHORT[status]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
