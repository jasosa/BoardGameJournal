"use client";

import Form from "next/form";
import { usePathname, useSearchParams } from "next/navigation";
import {
  parseLibraryParams,
  rawFromSearchParams,
} from "@/features/collection/library-query";

/**
 * The search field of the top bar (and, on small screens, of the Library page). Enter searches.
 * On the Library it keeps the other choices (status, players, time, sort, view); on any other
 * page it opens the Library with the search.
 */
export function BarSearch({
  id,
  className = "",
}: {
  /** Unique per instance, because the field can appear twice (bar and page) at different widths. */
  id: string;
  className?: string;
}) {
  const onLibrary = usePathname() === "/library";
  const params = parseLibraryParams(rawFromSearchParams(useSearchParams()));
  const q = onLibrary ? params.q : "";
  return (
    <Form action="/library" className={className}>
      {onLibrary
        ? params.statuses.map((status) => (
            <input key={status} type="hidden" name="status" value={status} />
          ))
        : null}
      {onLibrary && params.players !== null ? (
        <input type="hidden" name="players" value={params.players} />
      ) : null}
      {onLibrary && params.time !== null ? (
        <input type="hidden" name="time" value={params.time} />
      ) : null}
      {onLibrary && params.sort !== "recent" ? (
        <input type="hidden" name="sort" value={params.sort} />
      ) : null}
      {onLibrary && params.view !== "gallery" ? (
        <input type="hidden" name="view" value={params.view} />
      ) : null}
      <label className="sr-only" htmlFor={id}>
        Search your games
      </label>
      <input
        key={q}
        id={id}
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search your games"
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        className="border-edge text-ink placeholder:text-ink-soft focus-visible:outline-accent rounded-input min-h-11 w-full border bg-transparent px-3 text-sm"
      />
    </Form>
  );
}
