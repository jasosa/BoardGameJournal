"use client";

import { useActionState } from "react";
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
}: {
  entryId: string;
  current: CollectionStatus;
  label: string;
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  // A change takes the person's own "today", not the server's. Picking another date comes later.
  function submit(formData: FormData) {
    formData.set("changedOn", new Date().toLocaleDateString("en-CA"));
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
            className="border-edge text-ink-soft aria-pressed:pressed-glow aria-pressed:bg-raised aria-pressed:text-ink aria-pressed:font-medium duration-fast rounded-input inline-flex min-h-11 items-center border px-4 text-sm transition-colors disabled:opacity-60"
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      {state.error ? (
        <p role="alert" className="text-negative mt-2 text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
