import Link from "next/link";
import { GameGallery } from "@/components/library/GameGallery";
import { GameShelf } from "@/components/library/GameShelf";
import { GameTable } from "@/components/library/GameTable";
import { LibraryControls } from "@/components/library/LibraryControls";
import { Pagination } from "@/components/library/Pagination";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  hasActiveFilters,
  parseLibraryParams,
  queryLibrary,
} from "@/features/collection/library-query";
import { requireUser } from "@/server/authorization/require-user";
import { listLibrary } from "@/server/services/collection";

export const metadata = { title: "Library | Meeple Journal" };

const actionLink =
  "border-edge text-ink hover:border-bronze duration-fast rounded-input focus-visible:outline-bronze inline-flex min-h-11 items-center border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseLibraryParams(await searchParams);
  const { user, supabase } = await requireUser();
  const result = await listLibrary(supabase, user.id);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Library" />
        <section role="alert" className="bg-cream rounded-card px-6 py-8">
          <h2 className="text-xl">Could not load your library</h2>
          <p className="text-ink-soft mt-2">{result.error.message}</p>
          <Link
            href="/library"
            className="text-ink mt-4 inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Try again
          </Link>
        </section>
      </>
    );
  }

  if (result.data.length === 0) {
    return (
      <>
        <PageHeader title="Library" />
        <EmptyState
          title="No games yet"
          body="Add your first game and it will show up here."
          action={{ href: "/capture", label: "Add a game" }}
        />
      </>
    );
  }

  const page = queryLibrary(result.data, params);
  const filtered = hasActiveFilters(params);
  const count = filtered
    ? `${page.total} of ${result.data.length} games`
    : `${result.data.length} ${result.data.length === 1 ? "game" : "games"}`;

  return (
    <>
      <PageHeader title="Library" aside={count} compact />
      <LibraryControls params={params} />

      {page.total === 0 ? (
        <section role="status" className="bg-cream rounded-card px-6 py-8">
          <h2 className="text-xl">
            {params.q ? `Nothing matches "${params.q}"` : "Nothing matches"}
          </h2>
          <p className="text-ink-soft mt-2 max-w-prose">
            Try fewer filters or a different search.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={
                params.view === "gallery"
                  ? "/library"
                  : `/library?view=${params.view}`
              }
              className={actionLink}
            >
              Clear filters
            </Link>
            {params.q ? (
              <Link
                href={`/capture?title=${encodeURIComponent(params.q)}`}
                className={actionLink}
              >
                Add &quot;{params.q}&quot; as a new game
              </Link>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          {page.pageCount > 1 ? (
            <p className="text-ink-soft mb-4 text-sm" aria-live="polite">
              Showing {page.from} to {page.to} of {page.total}
            </p>
          ) : null}
          {params.view === "shelf" ? (
            <>
              {page.pageCount > 1 ? (
                <a
                  href="#library-pages"
                  className="bg-cream text-ink rounded-input focus-visible:outline-bronze sr-only mb-4 px-4 py-3 text-sm focus:not-sr-only focus:inline-flex focus-visible:outline-2"
                >
                  Skip to pages
                </a>
              ) : null}
              <GameShelf items={page.items} />
            </>
          ) : params.view === "table" ? (
            <GameTable items={page.items} />
          ) : (
            <GameGallery
              items={page.items}
              alwaysShowStatus={params.statuses.length > 1}
            />
          )}
          <Pagination params={params} result={page} />
        </>
      )}
    </>
  );
}
