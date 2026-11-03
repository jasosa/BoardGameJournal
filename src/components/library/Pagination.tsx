import Link from "next/link";
import {
  buildLibraryHref,
  type LibraryPage,
  type LibraryParams,
} from "@/features/collection/library-query";

const link =
  "border-edge text-ink hover:border-bronze duration-fast rounded-input focus-visible:outline-bronze inline-flex min-h-11 items-center border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const off =
  "border-line text-ink-faint rounded-input inline-flex min-h-11 items-center border px-4 text-sm";

export function Pagination({
  params,
  result,
}: {
  params: LibraryParams;
  result: LibraryPage;
}) {
  if (result.pageCount <= 1) return null;
  return (
    <nav
      id="library-pages"
      aria-label="Pages"
      className="mt-10 flex flex-wrap items-center gap-3"
    >
      {result.page > 1 ? (
        <Link
          rel="prev"
          href={buildLibraryHref(params, { page: result.page - 1 })}
          className={link}
        >
          Previous
        </Link>
      ) : (
        <span aria-hidden="true" className={off}>
          Previous
        </span>
      )}
      <p className="text-ink-soft text-sm">
        Page {result.page} of {result.pageCount}
      </p>
      {result.page < result.pageCount ? (
        <Link
          rel="next"
          href={buildLibraryHref(params, { page: result.page + 1 })}
          className={link}
        >
          Next
        </Link>
      ) : (
        <span aria-hidden="true" className={off}>
          Next
        </span>
      )}
    </nav>
  );
}
