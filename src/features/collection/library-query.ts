import { z } from "zod";
import { normalizeTitle } from "@/features/catalogue/title";
import {
  COLLECTION_STATUSES,
  type CollectionStatus,
  type LibraryItem,
} from "./schemas";

export const PAGE_SIZE = 48;
export const LIBRARY_VIEWS = ["gallery", "shelf", "table"] as const;
export const LIBRARY_SORTS = ["recent", "title"] as const;
/** "Up to N minutes". */
export const TIME_OPTIONS = [30, 60, 90, 120] as const;
/** "Plays with N people". */
export const PLAYER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type LibraryView = (typeof LIBRARY_VIEWS)[number];
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export type LibraryParams = {
  q: string;
  statuses: CollectionStatus[];
  players: number | null;
  time: number | null;
  sort: LibrarySort;
  view: LibraryView;
  page: number;
};

export const DEFAULT_PARAMS: LibraryParams = {
  q: "",
  statuses: [],
  players: null,
  time: null,
  sort: "recent",
  view: "gallery",
  page: 1,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends readonly (string | number)[]>(
  options: T,
  value: string | undefined,
): T[number] | null {
  if (value === undefined) return null;
  const found = options.find((option) => String(option) === value);
  return found ?? null;
}

const QUERY_MAX_LENGTH = 100;
const PAGE_MAX = 10_000;

/**
 * Reads the Library's URL. Anything unknown or malformed falls back to the default, so a
 * hand-edited or old link never breaks the page.
 */
export function parseLibraryParams(raw: RawSearchParams): LibraryParams {
  const q = (first(raw.q) ?? "").trim().slice(0, QUERY_MAX_LENGTH);

  const statusValues = Array.isArray(raw.status)
    ? raw.status
    : raw.status === undefined
      ? []
      : [raw.status];
  const statuses = COLLECTION_STATUSES.filter((status) =>
    statusValues.includes(status),
  );

  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_MAX)
    .catch(1)
    .parse(first(raw.page) ?? "1");

  return {
    q,
    statuses,
    players: oneOf(PLAYER_OPTIONS, first(raw.players)),
    time: oneOf(TIME_OPTIONS, first(raw.time)),
    sort: oneOf(LIBRARY_SORTS, first(raw.sort)) ?? DEFAULT_PARAMS.sort,
    view: oneOf(LIBRARY_VIEWS, first(raw.view)) ?? DEFAULT_PARAMS.view,
    page,
  };
}

/** The query string for `params`; defaults are left out so URLs stay short. */
export function buildLibraryHref(
  params: LibraryParams,
  patch: Partial<LibraryParams> = {},
): string {
  const next = { ...params, ...patch };
  const search = new URLSearchParams();
  if (next.q) search.set("q", next.q);
  for (const status of next.statuses) search.append("status", status);
  if (next.players !== null) search.set("players", String(next.players));
  if (next.time !== null) search.set("time", String(next.time));
  if (next.sort !== DEFAULT_PARAMS.sort) search.set("sort", next.sort);
  if (next.view !== DEFAULT_PARAMS.view) search.set("view", next.view);
  if (next.page > 1) search.set("page", String(next.page));
  const query = search.toString();
  return query ? `/library?${query}` : "/library";
}

export function hasActiveFilters(params: LibraryParams): boolean {
  return (
    params.q !== "" ||
    params.statuses.length > 0 ||
    params.players !== null ||
    params.time !== null
  );
}

export type LibraryPage = {
  items: LibraryItem[];
  /** Copies that match, before paging. */
  total: number;
  page: number;
  pageCount: number;
  /** 1-based position of the first and last item shown; 0 when nothing matches. */
  from: number;
  to: number;
};

const collator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

function matches(item: LibraryItem, params: LibraryParams): boolean {
  if (params.q) {
    const wanted = normalizeTitle(params.q);
    if (wanted && !normalizeTitle(item.title).includes(wanted)) return false;
  }
  if (params.statuses.length > 0 && !params.statuses.includes(item.status)) {
    return false;
  }
  if (params.players !== null) {
    const { minPlayers, maxPlayers } = item;
    if (minPlayers === null && maxPlayers === null) return false;
    const low = minPlayers ?? maxPlayers!;
    const high = maxPlayers ?? minPlayers!;
    if (params.players < low || params.players > high) return false;
  }
  if (params.time !== null) {
    if (item.playTimeMin === null || item.playTimeMin > params.time) {
      return false;
    }
  }
  return true;
}

/** Filters, sorts and pages the person's copies. Pure: the page does the fetching. */
export function queryLibrary(
  all: LibraryItem[],
  params: LibraryParams,
): LibraryPage {
  const found = all.filter((item) => matches(item, params));

  if (params.sort === "title") {
    // Array.prototype.sort is stable, so equal titles keep the newest-first order.
    found.sort((a, b) => collator.compare(a.title, b.title));
  }
  // "recent" keeps the order listLibrary returns: newest first.

  const total = found.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const items = found.slice(start, start + PAGE_SIZE);
  return {
    items,
    total,
    page,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: start + items.length,
  };
}
