import Link from "next/link";
import { GameGallery } from "@/components/library/GameGallery";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";
import { requireUser } from "@/server/authorization/require-user";
import { listLibrary } from "@/server/services/collection";

export const metadata = { title: "Library | Meeple Journal" };

export default async function LibraryPage() {
  const { supabase } = await requireUser();
  const result = await listLibrary(supabase);

  return (
    <>
      <PageHeader title="Library" />
      {!result.ok ? (
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
      ) : result.data.length === 0 ? (
        <EmptyState
          title="No games yet"
          body="Add your first game and it will show up here."
          action={{ href: "/capture", label: "Add a game" }}
        />
      ) : (
        <GameGallery items={result.data} />
      )}
    </>
  );
}
