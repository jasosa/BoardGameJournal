import Link from "next/link";
import {
  LIBRARY_VIEWS,
  buildLibraryHref,
  type LibraryParams,
  type LibraryView,
} from "@/features/collection/library-query";

const LABELS: Record<LibraryView, string> = {
  gallery: "Gallery",
  shelf: "Shelf",
  table: "Table",
};

/** Links, not buttons: each view has its own URL. Changing view goes back to page 1. */
export function ViewSwitch({ params }: { params: LibraryParams }) {
  return (
    <nav aria-label="Library view" className="mb-6">
      <ul className="flex gap-1">
        {LIBRARY_VIEWS.map((view) => {
          const current = view === params.view;
          return (
            <li key={view}>
              <Link
                href={buildLibraryHref(params, { view, page: 1 })}
                aria-current={current ? "page" : undefined}
                className={`rounded-input focus-visible:outline-bronze inline-flex min-h-11 items-center px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  current ? "bg-cream text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {LABELS[view]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
