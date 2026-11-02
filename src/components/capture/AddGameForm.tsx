"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { FormState } from "@/components/ui/form-state";
import {
  COLLECTION_STATUSES,
  STATUS_LABELS,
  TITLE_MAX_LENGTH,
} from "@/features/collection/schemas";

/** `field` says where the error belongs: under Title, or as a general message. */
export type AddGameState = FormState & {
  field?: "title" | null;
  title?: string;
  status?: string;
};

export function AddGameForm({
  action,
}: {
  action: (previous: AddGameState, formData: FormData) => Promise<AddGameState>;
}) {
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });
  const selected = state.status ?? "owned";

  return (
    // Keyed so a failed save puts the typed values back.
    <form
      key={`${state.title ?? ""}|${state.status ?? ""}|${state.error ?? ""}`}
      action={formAction}
      className="flex max-w-md flex-col gap-6"
      noValidate
    >
      <TextField
        label="Title"
        name="title"
        defaultValue={state.title ?? ""}
        maxLength={TITLE_MAX_LENGTH}
        autoComplete="off"
        required
        autoFocus
        error={state.field === "title" ? state.error : null}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Status</legend>
        <div className="flex flex-wrap gap-2">
          {COLLECTION_STATUSES.map((status) => (
            <label key={status} className="relative">
              <input
                type="radio"
                name="status"
                value={status}
                defaultChecked={selected === status}
                className="peer absolute inset-0 opacity-0"
              />
              <span className="border-line text-ink-soft peer-checked:border-ink peer-checked:bg-cream peer-checked:text-ink peer-focus-visible:outline-bronze duration-fast rounded-input inline-flex min-h-11 items-center border px-4 text-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {STATUS_LABELS[status]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && state.field !== "title" ? (
        <p role="alert" className="text-negative text-sm">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Save game"}
      </Button>
    </form>
  );
}
