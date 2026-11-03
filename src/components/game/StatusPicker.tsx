"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/TextField";
import type { FormState } from "@/components/ui/form-state";
import {
  COLLECTION_STATUSES,
  STATUS_LABELS,
  type CollectionStatus,
} from "@/features/collection/schemas";

/** Moves one copy of a game between statuses. The current status is marked, not recolored. */
export function StatusPicker({
  entryId,
  current,
  label,
  action,
  aside,
}: {
  entryId: string;
  current: CollectionStatus;
  label: string;
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  /** A link shown on the same line as "Different date", for example "Edit facts". */
  aside?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  // With no date chosen, use the person's own "today", not the server's.
  function submit(formData: FormData) {
    if (!String(formData.get("changedOn") ?? "").trim()) {
      formData.set("changedOn", new Date().toLocaleDateString("en-CA"));
    }
    formAction(formData);
  }

  return (
    <form action={submit}>
      <input type="hidden" name="entryId" value={entryId} />
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {COLLECTION_STATUSES.map((status) => (
          <button
            key={status}
            type="submit"
            name="status"
            value={status}
            disabled={pending}
            aria-pressed={status === current}
            className="border-edge text-ink-soft aria-pressed:pressed-glow aria-pressed:bg-cream aria-pressed:text-ink aria-pressed:font-medium duration-fast rounded-input inline-flex min-h-11 items-center border px-4 text-sm transition-colors disabled:opacity-60"
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-start gap-x-6">
        <details>
          <summary className="text-ink-soft hover:text-ink inline-flex min-h-11 cursor-pointer items-center text-sm underline underline-offset-4">
            Different date
          </summary>
          <div className="mt-1 max-w-xs">
            <TextField
              label="Date of change"
              name="changedOn"
              type="date"
              hint="Optional. Pick a status above to save it."
            />
          </div>
        </details>
        {aside}
      </div>
      {state.error ? (
        <p role="alert" className="text-negative mt-2 text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
