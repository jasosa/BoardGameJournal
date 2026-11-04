import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Database } from "@/lib/database/types";
import { listThoughts } from "@/server/services/thoughts";
import { ThoughtNotebook } from "./ThoughtNotebook";

/** The Thoughts section loads on its own, after the rest of the page. */
export async function ThoughtsSection({
  supabase,
  userId,
  gameId,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  gameId: string;
}) {
  const result = await listThoughts(supabase, userId, gameId);
  if (!result.ok) {
    return (
      <section aria-labelledby="thoughts-error-heading">
        <div className="mb-2 flex min-h-11 items-center">
          <h2 id="thoughts-error-heading" className="text-xl">
            Thoughts
          </h2>
        </div>
        <div
          role="alert"
          className="bg-raised rounded-card mt-1 flex max-w-2xl flex-col items-start gap-1 px-6 py-5"
        >
          <p>Could not load your thoughts.</p>
          <Link
            href={`/games/${gameId}`}
            className="text-ink focus-visible:outline-accent inline-flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Try again
          </Link>
        </div>
      </section>
    );
  }
  return (
    <ThoughtNotebook userId={userId} gameId={gameId} thoughts={result.data} />
  );
}

/** What shows while the section loads: the heading, three short bars, three rows. */
export function ThoughtsSkeleton() {
  return (
    <section aria-busy="true" aria-labelledby="thoughts-loading-heading">
      <div className="mb-2 flex min-h-11 items-center">
        <h2 id="thoughts-loading-heading" className="text-xl">
          Thoughts
        </h2>
      </div>
      <div className="mt-3 mb-6 flex gap-5">
        <div className="bg-raised rounded-input h-4 w-14" />
        <div className="bg-raised rounded-input h-4 w-24" />
        <div className="bg-raised rounded-input h-4 w-18" />
      </div>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className={`border-line py-4.5 ${row === 0 ? "pt-1" : "border-t"}`}
        >
          <div className="bg-raised rounded-input mb-3 h-3 w-30" />
          <div className="bg-raised rounded-input mb-2 h-3.5 max-w-xl" />
          <div className="bg-raised rounded-input h-3.5 w-3/5" />
        </div>
      ))}
      <span className="sr-only">Loading your thoughts</span>
    </section>
  );
}
