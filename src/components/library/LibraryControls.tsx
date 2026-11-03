"use client";

import Form from "next/form";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ViewSwitch } from "@/components/library/ViewSwitch";
import {
  PLAYER_OPTIONS,
  TIME_OPTIONS,
  hasActiveFilters,
  type LibraryParams,
} from "@/features/collection/library-query";
import {
  COLLECTION_STATUSES,
  STATUS_LABELS,
} from "@/features/collection/schemas";

const FORM_ID = "library-form";
const field =
  "border-line bg-paper text-ink rounded-input min-h-11 border px-3 text-base";
const quiet =
  "border-line text-ink hover:border-bronze duration-fast rounded-input focus-visible:outline-bronze inline-flex min-h-11 items-center border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * One toolbar row: search, a Filters button and the view switch. The filters open in a panel
 * below and apply as you choose (after a short pause, so arrowing through a list does not
 * reload on every key). The URL still holds all of it: the panel's inputs belong to the search
 * form through the `form` attribute.
 */
export function LibraryControls({ params }: { params: LibraryParams }) {
  const activeCount =
    params.statuses.length +
    (params.players !== null ? 1 : 0) +
    (params.time !== null ? 1 : 0);
  const [open, setOpen] = useState(activeCount > 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  function applySoon() {
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => {
      const form = document.getElementById(FORM_ID);
      if (form instanceof HTMLFormElement) form.requestSubmit();
    }, 350);
  }

  return (
    <div className="mb-8 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Form
          id={FORM_ID}
          action="/library"
          className="flex min-w-0 basis-full gap-2 sm:flex-1 sm:basis-0"
        >
          {params.view !== "gallery" ? (
            <input type="hidden" name="view" value={params.view} />
          ) : null}
          <label className="sr-only" htmlFor="library-search">
            Search your games
          </label>
          <input
            id="library-search"
            type="search"
            name="q"
            defaultValue={params.q}
            placeholder="Search your games"
            maxLength={100}
            autoComplete="off"
            className={`${field} min-w-0 flex-1`}
          />
          <button type="submit" className={quiet}>
            Search
          </button>
        </Form>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="library-filters"
          onClick={() => setOpen((value) => !value)}
          className={quiet}
        >
          <span
            aria-hidden="true"
            className={`duration-fast mr-2 inline-block transition-transform ${open ? "rotate-90" : ""}`}
          >
            ›
          </span>
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>

        <ViewSwitch params={params} className="ml-auto" />
      </div>

      <div
        id="library-filters"
        hidden={!open}
        onChange={applySoon}
        className="bg-cream rounded-card flex flex-col gap-5 px-5 py-5"
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Status</legend>
          <div className="flex flex-wrap gap-2">
            {COLLECTION_STATUSES.map((status) => (
              <label key={status} className="relative">
                <input
                  type="checkbox"
                  name="status"
                  form={FORM_ID}
                  value={status}
                  defaultChecked={params.statuses.includes(status)}
                  className="peer absolute inset-0 opacity-0"
                />
                <span className="border-line bg-paper text-ink-soft peer-checked:border-ink peer-checked:text-ink peer-focus-visible:outline-bronze duration-fast rounded-input inline-flex min-h-11 items-center border px-4 text-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                  {STATUS_LABELS[status]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="library-players" className="text-sm font-medium">
              Players
            </label>
            <select
              id="library-players"
              name="players"
              form={FORM_ID}
              defaultValue={params.players ?? ""}
              className={field}
            >
              <option value="">Any number</option>
              {PLAYER_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "1 player" : `${n} players`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="library-time" className="text-sm font-medium">
              Play time
            </label>
            <select
              id="library-time"
              name="time"
              form={FORM_ID}
              defaultValue={params.time ?? ""}
              className={field}
            >
              <option value="">Any length</option>
              {TIME_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Up to {n} min
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="library-sort" className="text-sm font-medium">
              Sort
            </label>
            <select
              id="library-sort"
              name="sort"
              form={FORM_ID}
              defaultValue={params.sort}
              className={field}
            >
              <option value="recent">Recently added</option>
              <option value="title">Title</option>
            </select>
          </div>
          {hasActiveFilters(params) ? (
            <Link
              href={
                params.view === "gallery"
                  ? "/library"
                  : `/library?view=${params.view}`
              }
              className="text-ink inline-flex min-h-11 items-center text-sm underline underline-offset-4"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
