"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/components/ui/form-state";
import { COVER_ACCEPT, COVER_MAX_BYTES } from "@/features/catalogue/cover";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/** Choose, replace or remove the cover. Choosing a file uploads it straight away. */
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
  const error =
    (tooLarge ? "That image is larger than 10 MB." : null) ??
    uploadState.error ??
    removeState.error;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-4">
        <form action={upload}>
          <input type="hidden" name="gameId" value={gameId} />
          <label className="relative inline-flex">
            <input
              type="file"
              name="cover"
              accept={COVER_ACCEPT}
              disabled={uploading || removing}
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
            <span className="text-ink-soft hover:text-ink peer-focus-visible:outline-bronze inline-flex min-h-11 items-center text-sm underline underline-offset-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
              {uploading
                ? "Uploading"
                : hasCover
                  ? "Replace cover"
                  : "Add cover"}
            </span>
          </label>
        </form>

        {hasCover ? (
          <form action={remove}>
            <input type="hidden" name="gameId" value={gameId} />
            <Button
              type="submit"
              variant="quiet"
              disabled={uploading || removing}
              className="text-ink-soft hover:text-ink border-0 px-0! underline underline-offset-4"
            >
              {removing ? "Removing" : "Remove cover"}
            </Button>
          </form>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-negative text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
