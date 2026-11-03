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

const link =
  "text-ink-soft hover:text-ink focus-visible:outline-accent duration-fast inline-flex min-h-11 items-center border-b-2 border-transparent px-2 text-xs font-semibold tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current=page]:border-ink aria-[current=page]:text-ink";

/** Links, not buttons: each view has its own URL. Changing view goes back to page 1. */
export function ViewSwitch({
  params,
  className = "",
}: {
  params: LibraryParams;
  className?: string;
}) {
  return (
    <nav aria-label="Library view" className={`flex ${className}`}>
      {LIBRARY_VIEWS.map((view) => (
        <Link
          key={view}
          href={buildLibraryHref(params, { view, page: 1 })}
          aria-current={view === params.view ? "page" : undefined}
          className={link}
        >
          {LABELS[view]}
        </Link>
      ))}
    </nav>
  );
}
