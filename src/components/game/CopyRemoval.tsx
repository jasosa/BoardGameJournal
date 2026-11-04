"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/components/ui/form-state";
import { menuItemClass, useCloseMenu } from "./ManageMenu";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

const quietButton =
  "text-ink-soft hover:text-ink inline-flex min-h-11 items-center text-sm underline underline-offset-4 disabled:opacity-60";

/**
 * A row in the Manage menu: takes one copy out of the Library (archive, undoable). The menu
 * closes when it is done; the copy then shows its archived state (see CopyRemoval).
 */
export function ArchiveCopyItem({
  entryId,
  copyLabel = "",
  action,
}: {
  entryId: string;
  /** Names the copy when there are several, for example " (copy 2)". */
  copyLabel?: string;
  action: Action;
}) {
  const [state, form, pending] = useActionState(action, { error: null });
  const closeMenu = useCloseMenu();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) closeMenu();
    wasPending.current = pending;
  }, [pending, state.error, closeMenu]);

  return (
    <form action={form}>
      <input type="hidden" name="entryId" value={entryId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remove from library${copyLabel}`}
        className={menuItemClass}
      >
        {pending ? "Removing" : "Remove from library"}
        {copyLabel ? <span aria-hidden="true">{copyLabel}</span> : null}
      </button>
      {state.error ? (
        <p role="alert" className="text-negative px-3 pb-2 text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * The state of an archived copy: restore it, or delete it for good. Permanent delete asks first
 * and says what is lost. Focus moves to what changed, so keyboard and screen reader users are
 * not dropped at the top of the page. Shows nothing for a copy that is in the Library.
 */
export function CopyRemoval({
  entryId,
  archived,
  copyLabel = "",
  restoreAction,
  deleteAction,
}: {
  entryId: string;
  archived: boolean;
  /** Names the copy when there are several, for example " (copy 2)". */
  copyLabel?: string;
  restoreAction: Action;
  deleteAction: Action;
}) {
  const [restoreState, restoreForm, restoring] = useActionState(restoreAction, {
    error: null,
  });
  const [deleteState, deleteForm, deleting] = useActionState(deleteAction, {
    error: null,
  });
  const [confirming, setConfirming] = useState(false);
  const error = restoreState.error ?? deleteState.error;

  const noteRef = useRef<HTMLParagraphElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const wasArchived = useRef(archived);

  // After archiving, the note takes focus.
  useEffect(() => {
    if (wasArchived.current === archived) return;
    wasArchived.current = archived;
    setConfirming(false);
    if (archived) noteRef.current?.focus();
  }, [archived]);

  // Opening the confirm puts focus on Cancel, the safe choice.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  function cancel() {
    setConfirming(false);
    // The trigger comes back on the next render; focus it then.
    requestAnimationFrame(() => openRef.current?.focus());
  }

  if (!archived) return null;

  return (
    <div className="mt-1">
      {archived ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <p
            ref={noteRef}
            tabIndex={-1}
            className="text-ink-soft text-sm focus:outline-none"
          >
            Archived. Hidden from your Library. History is kept.
          </p>
          <form action={restoreForm}>
            <input type="hidden" name="entryId" value={entryId} />
            <button
              type="submit"
              disabled={restoring}
              aria-label={`Restore${copyLabel}`}
              className={quietButton}
            >
              {restoring ? "Restoring" : "Restore"}
            </button>
          </form>
          {confirming ? null : (
            <button
              ref={openRef}
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete permanently${copyLabel}`}
              className={quietButton}
            >
              Delete permanently
            </button>
          )}
        </div>
      ) : null}

      {archived && confirming ? (
        <form
          action={deleteForm}
          role="group"
          aria-label={`Confirm permanent delete${copyLabel}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") cancel();
          }}
          className="bg-raised rounded-card mt-2 max-w-md px-4 py-3"
        >
          <input type="hidden" name="entryId" value={entryId} />
          <p className="text-sm">
            This deletes this copy and its status history for good. It cannot be
            undone.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={cancel}
              className="border-edge text-ink hover:bg-canvas rounded-input inline-flex min-h-11 items-center border px-4 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleting}
              className="border-negative text-negative rounded-input inline-flex min-h-11 items-center border px-4 text-sm font-medium disabled:opacity-60"
            >
              {deleting ? "Deleting" : "Delete permanently"}
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="text-negative mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
