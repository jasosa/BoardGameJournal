"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { FormState } from "@/components/ui/form-state";
import {
  COLLECTION_STATUSES,
  STATUS_LABELS,
  TITLE_MAX_LENGTH,
  type TitleMatch,
} from "@/features/collection/schemas";

/** `field` says where the error belongs: under Title, or as a general message. */
export type AddGameState = FormState & {
  field?: "title" | null;
  title?: string;
  status?: string;
  /** Games the person already has under this title. Nothing is saved until they choose. */
  duplicates?: TitleMatch[];
};

export function AddGameForm({
  action,
  initialTitle = "",
}: {
  initialTitle?: string;
  action: (previous: AddGameState, formData: FormData) => Promise<AddGameState>;
}) {
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });
  const selected = state.status ?? "owned";
  // Typing in the title takes the notice away, so Save game comes back for a different title.
  const [editedAt, setEditedAt] = useState<AddGameState | null>(null);
  // Screen readers can miss a notice that appears already filled in, so focus moves to it.
  const noticeRef = useRef<HTMLDivElement>(null);
  const duplicates = editedAt === state ? [] : (state.duplicates ?? []);
  useEffect(() => {
    if (duplicates.length > 0) noticeRef.current?.focus();
  }, [duplicates.length, state]);

  // The first history row gets the person's own "today", not the server's.
  function submit(formData: FormData) {
    formData.set("addedOn", new Date().toLocaleDateString("en-CA"));
    formAction(formData);
  }

  return (
    // Keyed so a failed save puts the typed values back.
    <form
      key={`${state.title ?? ""}|${state.status ?? ""}|${state.error ?? ""}`}
      action={submit}
      className="flex max-w-md flex-col gap-6"
      noValidate
    >
      <TextField
        label="Title"
        name="title"
        defaultValue={state.title ?? initialTitle}
        maxLength={TITLE_MAX_LENGTH}
        autoComplete="off"
        required
        autoFocus
        onChange={() => setEditedAt(state)}
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
              <span className="border-edge text-ink-soft peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas peer-checked:font-medium peer-focus-visible:outline-accent duration-fast rounded-input inline-flex min-h-11 items-center border px-4 text-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {STATUS_LABELS[status]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {duplicates.length > 0 ? (
        <div
          ref={noticeRef}
          role="status"
          tabIndex={-1}
          className="bg-raised rounded-card flex flex-col gap-4 px-4 py-4 focus:outline-none"
        >
          {duplicates.map((match) => (
            <div key={match.gameId} className="flex flex-col gap-3">
              <p className="text-sm">
                You already have <strong>{match.title}</strong> (
                {STATUS_LABELS[match.status]}
                {match.archived ? ", archived" : ""}).
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/games/${match.gameId}`}
                  className="border-edge text-ink hover:border-accent duration-fast rounded-input inline-flex min-h-11 items-center border px-4 text-sm transition-colors"
                >
                  Open {match.title}
                </Link>
                <Button
                  type="submit"
                  name="copyOf"
                  value={match.gameId}
                  disabled={pending}
                  variant="quiet"
                >
                  {pending ? "Saving" : "Add another copy"}
                </Button>
              </div>
            </div>
          ))}
          <p className="text-ink-soft text-sm">
            To add a different game, change the title.
          </p>
        </div>
      ) : null}

      {state.error && state.field !== "title" ? (
        <p role="alert" className="text-negative text-sm">
          {state.error}
        </p>
      ) : null}

      {duplicates.length > 0 ? null : (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save game"}
        </Button>
      )}
    </form>
  );
}
