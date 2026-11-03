import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  buildLibraryHref,
  DEFAULT_PARAMS,
  hasActiveFilters,
  parseLibraryParams,
  queryLibrary,
  type LibraryParams,
} from "./library-query";
import type { CollectionStatus, LibraryItem } from "./schemas";

function item(
  title: string,
  extra: Partial<LibraryItem> & { status?: CollectionStatus } = {},
): LibraryItem {
  return {
    entryId: `e-${title}`,
    gameId: `g-${title}`,
    title,
    status: "owned",
    cover: null,
    coverWidth: null,
    coverHeight: null,
    accent: null,
    year: null,
    minPlayers: null,
    maxPlayers: null,
    playTimeMin: null,
    ...extra,
  };
}

const params = (patch: Partial<LibraryParams> = {}): LibraryParams => ({
  ...DEFAULT_PARAMS,
  ...patch,
});
const titles = (items: LibraryItem[]) => items.map((i) => i.title);
const run = (all: LibraryItem[], patch: Partial<LibraryParams>) =>
  titles(queryLibrary(all, params(patch)).items);

describe("parseLibraryParams", () => {
  it("gives defaults for an empty query", () => {
    expect(parseLibraryParams({})).toEqual(DEFAULT_PARAMS);
  });

  it("reads every parameter", () => {
    expect(
      parseLibraryParams({
        q: "  wing ",
        status: ["owned", "wishlist"],
        players: "4",
        time: "60",
        sort: "title",
        view: "table",
        page: "3",
      }),
    ).toEqual({
      q: "wing",
      statuses: ["owned", "wishlist"],
      players: 4,
      time: 60,
      sort: "title",
      view: "table",
      page: 3,
    });
  });

  it("accepts a single status given as a string", () => {
    expect(parseLibraryParams({ status: "wishlist" }).statuses).toEqual([
      "wishlist",
    ]);
  });

  it("ignores junk instead of failing", () => {
    expect(
      parseLibraryParams({
        status: ["zzz", "owned", "owned"],
        players: "abc",
        time: "999",
        sort: "price",
        view: "carousel",
        page: "-1",
      }),
    ).toEqual({ ...DEFAULT_PARAMS, statuses: ["owned"] });
    expect(parseLibraryParams({ page: "1.5" }).page).toBe(1);
    expect(parseLibraryParams({ page: "99999999" }).page).toBe(1);
    expect(parseLibraryParams({ page: "abc" }).page).toBe(1);
  });

  it("takes the first value of a repeated single parameter and caps q", () => {
    expect(parseLibraryParams({ players: ["2", "5"] }).players).toBe(2);
    expect(parseLibraryParams({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});

describe("buildLibraryHref", () => {
  it("leaves defaults out", () => {
    expect(buildLibraryHref(DEFAULT_PARAMS)).toBe("/library");
  });

  it("round-trips through parseLibraryParams", () => {
    const full = params({
      q: "ticket to ride",
      statuses: ["owned", "interested"],
      players: 2,
      time: 90,
      sort: "title",
      view: "shelf",
      page: 2,
    });
    const url = new URL(buildLibraryHref(full), "http://x");
    const raw: Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const all = url.searchParams.getAll(key);
      raw[key] = all.length > 1 ? all : all[0]!;
    }
    expect(parseLibraryParams(raw)).toEqual(full);
  });

  it("applies a patch without changing the original", () => {
    const base = params({ q: "a", page: 4 });
    expect(buildLibraryHref(base, { page: 1 })).toBe("/library?q=a");
    expect(base.page).toBe(4);
  });
});

describe("hasActiveFilters", () => {
  it("is false for defaults and for sort, view and page only", () => {
    expect(hasActiveFilters(DEFAULT_PARAMS)).toBe(false);
    expect(
      hasActiveFilters(params({ sort: "title", view: "table", page: 3 })),
    ).toBe(false);
  });
  it("is true for a search or any filter", () => {
    expect(hasActiveFilters(params({ q: "a" }))).toBe(true);
    expect(hasActiveFilters(params({ statuses: ["owned"] }))).toBe(true);
    expect(hasActiveFilters(params({ players: 2 }))).toBe(true);
    expect(hasActiveFilters(params({ time: 30 }))).toBe(true);
  });
});

describe("queryLibrary: search", () => {
  const all = [item("Wingspan"), item("Carcassonne"), item("Catan: Seafarers")];

  it("ignores case, accents and punctuation, and matches parts", () => {
    expect(run(all, { q: "WING" })).toEqual(["Wingspan"]);
    expect(run(all, { q: "carcassoñ" })).toEqual(["Carcassonne"]);
    expect(run(all, { q: "catan seafarers" })).toEqual(["Catan: Seafarers"]);
  });

  it("matches everything when the search has no letters or digits", () => {
    expect(queryLibrary(all, params({ q: "!!" })).total).toBe(3);
  });

  it("finds nothing for a missing title", () => {
    const result = queryLibrary(all, params({ q: "zzz" }));
    expect(result.total).toBe(0);
    expect(result.from).toBe(0);
    expect(result.to).toBe(0);
    expect(result.pageCount).toBe(1);
  });
});

describe("queryLibrary: status, players, time", () => {
  const all = [
    item("A", { minPlayers: 1, maxPlayers: 4, playTimeMin: 30 }),
    item("B", {
      status: "wishlist",
      minPlayers: 2,
      maxPlayers: 2,
      playTimeMin: 60,
    }),
    item("C", {
      status: "interested",
      minPlayers: 3,
      maxPlayers: 6,
      playTimeMin: 120,
    }),
    item("D"),
    item("E", { minPlayers: 2, playTimeMin: 45 }),
  ];

  it("filters by one or several statuses", () => {
    expect(run(all, { statuses: ["owned"] })).toEqual(["A", "D", "E"]);
    expect(run(all, { statuses: ["wishlist", "interested"] })).toEqual([
      "B",
      "C",
    ]);
  });

  it("filters by player count, including both ends", () => {
    expect(run(all, { players: 1 })).toEqual(["A"]);
    expect(run(all, { players: 2 })).toEqual(["A", "B", "E"]);
    expect(run(all, { players: 4 })).toEqual(["A", "C"]);
    expect(run(all, { players: 6 })).toEqual(["C"]);
    expect(run(all, { players: 8 })).toEqual([]);
  });

  it("treats a game with only one known player number as fixed", () => {
    // E has only a minimum of 2.
    expect(run(all, { players: 3 })).not.toContain("E");
  });

  it("filters by play time, and drops games without a time", () => {
    expect(run(all, { time: 30 })).toEqual(["A"]);
    expect(run(all, { time: 60 })).toEqual(["A", "B", "E"]);
    expect(run(all, { time: 120 })).toEqual(["A", "B", "C", "E"]);
  });

  it("combines filters", () => {
    expect(run(all, { statuses: ["owned"], players: 2, time: 60 })).toEqual([
      "A",
      "E",
    ]);
  });
});

describe("queryLibrary: sort", () => {
  it("keeps the given order for recent", () => {
    const all = [item("b"), item("a"), item("c")];
    expect(run(all, {})).toEqual(["b", "a", "c"]);
  });

  it("sorts titles ignoring case and accents, with numbers in order", () => {
    const all = [
      item("zeta"),
      item("Émile"),
      item("alpha"),
      item("Game 10"),
      item("Game 2"),
    ];
    expect(run(all, { sort: "title" })).toEqual([
      "alpha",
      "Émile",
      "Game 2",
      "Game 10",
      "zeta",
    ]);
  });

  it("keeps ties in the given order", () => {
    const first = item("Same", { entryId: "1" });
    const second = item("Same", { entryId: "2" });
    const sorted = queryLibrary([first, second], params({ sort: "title" }));
    expect(sorted.items.map((i) => i.entryId)).toEqual(["1", "2"]);
  });
});

describe("queryLibrary: paging", () => {
  const all = Array.from({ length: PAGE_SIZE * 2 + 5 }, (_, i) =>
    item(`Game ${String(i).padStart(3, "0")}`),
  );

  it("returns the first page with counts", () => {
    const result = queryLibrary(all, params());
    expect(result.items).toHaveLength(PAGE_SIZE);
    expect(result.total).toBe(all.length);
    expect(result.pageCount).toBe(3);
    expect([result.from, result.to]).toEqual([1, PAGE_SIZE]);
  });

  it("returns a partial last page", () => {
    const result = queryLibrary(all, params({ page: 3 }));
    expect(result.items).toHaveLength(5);
    expect([result.from, result.to]).toEqual([PAGE_SIZE * 2 + 1, all.length]);
  });

  it("clamps a page past the end", () => {
    const result = queryLibrary(all, params({ page: 99 }));
    expect(result.page).toBe(3);
    expect(result.items).toHaveLength(5);
  });

  it("handles an empty library", () => {
    const result = queryLibrary([], params({ page: 4 }));
    expect(result).toMatchObject({
      total: 0,
      page: 1,
      pageCount: 1,
      items: [],
    });
  });
});
