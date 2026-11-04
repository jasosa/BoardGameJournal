"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/components/ui/form-state";
import { COVER_ACCEPT, COVER_MAX_BYTES } from "@/features/catalogue/cover";
import { menuItemClass, useCloseMenu } from "./ManageMenu";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/**
 * Choose, replace or remove the cover: rows inside the cover chip's popover, or (with `tile`) the empty cover tile itself. Choosing a file uploads it
 * straight away, and the menu closes when the change is done.
 */
export function CoverControls({
  gameId,
  hasCover,
  uploadAction,
  removeAction,
  tile,
}: {
  gameId: string;
  hasCover: boolean;
  /** With no cover yet: the empty cover tile, which becomes the "Add cover" target itself. */
  tile?: React.ReactNode;
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
        <label
          className={tile ? "group relative block" : "group relative flex"}
        >
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
          {tile ? (
            <>
              {tile}
              <span className="text-ink-soft group-hover:text-ink peer-focus-visible:outline-accent mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {uploading ? "Uploading" : "Add cover"}
              </span>
            </>
          ) : (
            <span
              className={`${menuItemClass} group-hover:text-ink group-hover:bg-canvas peer-focus-visible:outline-accent peer-focus-visible:outline-2 peer-disabled:opacity-60`}
            >
              {uploading
                ? "Uploading"
                : hasCover
                  ? "Replace cover"
                  : "Add cover"}
            </span>
          )}
        </label>
      </form>

      {hasCover && !tile ? (
        <form action={remove}>
          <input type="hidden" name="gameId" value={gameId} />
          <button type="submit" disabled={busy} className={menuItemClass}>
            {removing ? "Removing" : "Remove cover"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p
          role="alert"
          className={
            tile ? "text-negative text-sm" : "text-negative px-3 pb-2 text-sm"
          }
        >
          {error}
        </p>
      ) : null}
    </>
  );
}
