"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  formatAssessmentDate,
  formatScore,
} from "@/features/assessments/history";

/** What the rate action returns. `value` puts the typed text back after an error. */
export type RateState = {
  error: string | null;
  /** Keyed like the form: overall, assessedOn. */
  fieldErrors?: Record<string, string>;
  value?: string;
  /** Changes after each saved rating, so the form starts empty again. */
  savedAt?: number;
};

type Entry = { id: string; overall: number; assessedOn: string };

/** How many earlier ratings are listed in the popover. */
const EARLIER_SHOWN = 8;

/**
 * "Your rating" in the facts row: the current number is the button, and it opens a small
 * popover to rate again. Ratings are never edited, so a new number is a new dated rating, and
 * the earlier ones are listed underneath.
 */
export function RatingPopover({
  gameId,
  current,
  earlier,
  action,
}: {
  gameId: string;
  current: Entry | null;
  /** Older ratings, latest first. */
  earlier: Entry[];
  action: (previous: RateState, formData: FormData) => Promise<RateState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const wasOpen = useRef(false);

  // The number in the stepper. It starts from the current rating, or the middle of the scale.
  const [draft, setDraft] = useState("5");
  const fieldId = useId();
  const errorId = useId();
  function step(by: number) {
    const parsed = Number(draft.replace(",", "."));
    const base = Number.isFinite(parsed) ? parsed : 5;
    // Steps of one half; typing allows any single decimal.
    const next = Math.min(10, Math.max(0, Math.round((base + by) * 2) / 2));
    setDraft(String(next));
  }

  // A saved rating closes the popover; the new number on the button is the result. State is
  // adjusted while rendering, as React recommends for state that follows another value.
  const [seenSaved, setSeenSaved] = useState(state.savedAt);
  if (state.savedAt !== seenSaved) {
    setSeenSaved(state.savedAt);
    if (state.savedAt) setOpen(false);
  }

  // Opening puts focus in the field; closing by Escape or after a save returns it to the button.
  useEffect(() => {
    if (open) {
      root.current?.querySelector<HTMLElement>("input[name=overall]")?.focus();
    } else if (wasOpen.current) {
      const active = document.activeElement;
      if (active === document.body || root.current?.contains(active)) {
        trigger.current?.focus();
      }
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // After a failed save, focus goes back to the field with the message.
  useEffect(() => {
    if (state.error) {
      root.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
    }
  }, [state]);

  // The opinion takes the person's own "today", not the server's.
  function submit(formData: FormData) {
    formData.set("assessedOn", new Date().toLocaleDateString("en-CA"));
    formAction(formData);
  }

  const error =
    state.fieldErrors?.overall ?? state.fieldErrors?.assessedOn ?? state.error;
  const shown = earlier.slice(0, EARLIER_SHOWN);
  const label = current ? `${formatScore(current.overall)} / 10` : "Rate";

  return (
    <div ref={root} className="md:relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          current
            ? `Your rating, ${formatScore(current.overall)} out of 10. Change it.`
            : "Rate this game"
        }
        onClick={() => {
          if (!open) setDraft(current ? formatScore(current.overall) : "5");
          setOpen((value) => !value);
        }}
        className="font-display focus-visible:outline-accent decoration-ink-faint inline-flex min-h-11 items-center text-xl font-semibold underline decoration-dashed underline-offset-8 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {label}
      </button>
      <span role="status" className="sr-only">
        {state.savedAt ? "Rating saved." : ""}
      </span>

      <div
        id={panelId}
        role="group"
        aria-label="Rate this game"
        hidden={!open}
        className="bg-raised rounded-card shadow-lift absolute z-30 mt-1 p-4 max-md:inset-x-0 max-md:top-auto md:top-full md:left-0 md:w-80"
      >
        <form
          // Keyed so a saved rating clears the field and a failed one puts the typed value back.
          key={`${state.savedAt ?? ""}|${state.error ?? ""}`}
          action={submit}
          noValidate
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="gameId" value={gameId} />
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId} className="text-sm font-medium">
              Rating, 0 to 10
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Lower the rating"
                disabled={pending}
                onClick={() => step(-0.5)}
                className="border-edge hover:border-ink focus-visible:outline-accent rounded-input grid size-11 shrink-0 place-items-center border text-xl focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              >
                <span aria-hidden="true">−</span>
              </button>
              <input
                id={fieldId}
                name="overall"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className="border-edge bg-canvas text-ink rounded-input font-display min-h-11 w-20 min-w-0 border px-2 text-center text-2xl font-semibold"
              />
              <button
                type="button"
                aria-label="Raise the rating"
                disabled={pending}
                onClick={() => step(0.5)}
                className="border-edge hover:border-ink focus-visible:outline-accent rounded-input grid size-11 shrink-0 place-items-center border text-xl focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              >
                <span aria-hidden="true">+</span>
              </button>
              <Button type="submit" disabled={pending} className="ml-auto">
                {pending ? "Saving" : "Save"}
              </Button>
            </div>
            {error ? (
              <p id={errorId} role="alert" className="text-negative text-sm">
                {error}
              </p>
            ) : (
              <p className="text-ink-soft text-sm">
                Steps of one half. Type a number for one decimal, like 8.7.
              </p>
            )}
          </div>
        </form>

        {shown.length > 0 ? (
          <div className="border-line mt-4 border-t pt-3">
            <p className="text-ink-soft mb-2 text-xs font-semibold tracking-widest uppercase">
              Earlier
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {shown.map((entry) => (
                <li key={entry.id} className="flex justify-between gap-4">
                  <span className="font-medium">
                    {formatScore(entry.overall)}
                  </span>
                  <time dateTime={entry.assessedOn} className="text-ink-soft">
                    {formatAssessmentDate(entry.assessedOn)}
                  </time>
                </li>
              ))}
            </ul>
            {earlier.length > shown.length ? (
              <p className="text-ink-soft mt-2 text-sm">
                and {earlier.length - shown.length} more
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
