import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Database } from "@/lib/database/types";
import { getDataSummary } from "@/server/services/data-export";
import { ExportBlock } from "./ExportBlock";
import { ImportBlock } from "./ImportBlock";

/** Your data: export and import. Loads on its own, so Sign out never waits for the counts. */
export async function DataSection({
  supabase,
  userId,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const summary = await getDataSummary(supabase, userId);
  if (!summary.ok) {
    return (
      <section aria-labelledby="data-error-heading" className="max-w-2xl">
        <h2 id="data-error-heading" className="mb-3 text-xl">
          Your data
        </h2>
        <div
          role="alert"
          className="bg-raised rounded-card flex flex-col items-start gap-1 px-6 py-5"
        >
          <p>
            Could not read your data just now, so export and import are not
            available.
          </p>
          <Link
            href="/settings"
            className="text-ink inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Try again
          </Link>
        </div>
      </section>
    );
  }

  const { empty, ...counts } = summary.data;
  return (
    <section aria-labelledby="data-heading" className="max-w-2xl">
      <h2 id="data-heading" className="mb-3 text-xl">
        Your data
      </h2>
      <div className="flex flex-col gap-9">
        <ExportBlock counts={counts} empty={empty} />
        <ImportBlock empty={empty} />
      </div>
    </section>
  );
}

/** What shows while the counts load: the heading, bars for Export (two lines and a button) and Import. */
export function DataSectionSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="data-loading-heading"
      className="max-w-2xl"
    >
      <h2 id="data-loading-heading" className="mb-3 text-xl">
        Your data
      </h2>
      <div className="flex flex-col gap-9">
        <div>
          <h3 className="mb-1.5 text-lg font-semibold">Export</h3>
          <div className="bg-raised rounded-input mb-2 h-4 w-4/5" />
          <div className="bg-raised rounded-input mb-3 h-3.5 w-3/5" />
          <div className="bg-raised rounded-input h-11 w-40" />
        </div>
        <div>
          <h3 className="mb-1.5 text-lg font-semibold">Import</h3>
          <div className="bg-raised rounded-input mb-2 h-4 w-full max-w-prose" />
          <div className="bg-raised rounded-input h-4 w-2/3" />
        </div>
      </div>
      <span className="sr-only">Loading a summary of your data</span>
    </section>
  );
}
