"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/components/ui/form-state";
import { COVER_ACCEPT, COVER_MAX_BYTES } from "@/features/catalogue/cover";
import { menuItemClass, useCloseMenu } from "./ManageMenu";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/**
 * Rows of the Manage menu: choose, replace or remove the cover. Choosing a file uploads it
 * straight away, and the menu closes when the change is done.
 */
export function CoverControls({
  gameId,
  hasCover,
  uploadAction,
  removeAction,
}: {
  gameId: string;
  hasCover: boolean;
  uploadAction: Action;
  removeAction: Action;
}) {
  const [uploadState, upload, uploading] = useActionState(uploadAction, {
    error: null,
  });
  const [removeState, remove, removing] = useActionState(removeAction, {
    error: null,
  });
  // Checked in the browser too, so a huge file is refused before it is sent. The server checks again.
  const [tooLarge, setTooLarge] = useState(false);
  const closeMenu = useCloseMenu();
  const busy = uploading || removing;
  const wasBusy = useRef(false);
  const failed = Boolean(uploadState.error ?? removeState.error);
  useEffect(() => {
    if (wasBusy.current && !busy && !failed) closeMenu();
    wasBusy.current = busy;
  }, [busy, failed, closeMenu]);

  const error =
    (tooLarge ? "That image is larger than 10 MB." : null) ??
    uploadState.error ??
    removeState.error;

  return (
    <>
      <form action={upload}>
        <input type="hidden" name="gameId" value={gameId} />
        <label className="relative flex">
          <input
            type="file"
            name="cover"
            accept={COVER_ACCEPT}
            disabled={busy}
            onChange={(event) => {
              const chosen = event.currentTarget.files?.[0];
              if (chosen && chosen.size > COVER_MAX_BYTES) {
                setTooLarge(true);
                event.currentTarget.value = "";
                return;
              }
              setTooLarge(false);
              event.currentTarget.form?.requestSubmit();
            }}
            className="peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
          />
          <span
            className={`${menuItemClass} peer-focus-visible:outline-accent peer-focus-visible:outline-2 peer-disabled:opacity-60`}
          >
            {uploading ? "Uploading" : hasCover ? "Replace cover" : "Add cover"}
          </span>
        </label>
      </form>

      {hasCover ? (
        <form action={remove}>
          <input type="hidden" name="gameId" value={gameId} />
          <button type="submit" disabled={busy} className={menuItemClass}>
            {removing ? "Removing" : "Remove cover"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="text-negative px-3 pb-2 text-sm">
          {error}
        </p>
      ) : null}
    </>
  );
}
