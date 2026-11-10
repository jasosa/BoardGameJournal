import { describe, expect, it } from "vitest";
import { buildExportData, type ExportRows } from "./build";
import { checkExportFile, fileMessage, PROBLEMS_HINT } from "./check-file";
import {
  countItems,
  exportFileName,
  formatBytes,
  formatDay,
  importResultSentence,
} from "./format";
import { IMPORT_MAX_BYTES } from "./schemas";

function validFile() {
  return {
    format: "meeple-journal-export",
    version: 1,
    exported_at: "2026-11-10T17:42:07Z",
    games: [
      {
        id: "g1",
        name: "Wingspan",
        year: 2019,
        min_players: 1,
        max_players: 5,
        play_time_min: 70,
        description: null as string | null,
        kind: "base",
        source: "manual",
        created_at: "2026-01-01T10:00:00+00:00",
        cover: { path: "u/g/v/cover.webp" },
        copies: [
          {
            id: "c1",
            status: "owned",
            archived_at: null,
            acquired_on: null,
            sold_on: null,
            price: null,
            currency: null,
            source: null,
            notes: null,
            created_at: "2026-01-01T10:00:00+00:00",
            history: [
              {
                from_status: null,
                to_status: "wishlist",
                changed_on: "2026-01-01",
                recorded_at: "2026-01-01T10:00:00+00:00",
              },
              {
                from_status: "wishlist",
                to_status: "owned",
                changed_on: "2026-02-01",
                recorded_at: "2026-02-01T10:00:00+00:00",
              },
            ],
          },
        ],
        ratings: [
          {
            overall: 8.5,
            assessed_on: "2026-03-02",
            created_at: "2026-03-02T10:00:00+00:00",
          },
        ],
        thoughts: [
          {
            body: "Lovely.",
            topics: ["mechanics", "artwork"],
            written_on: "2026-03-03",
            created_at: "2026-03-03T10:00:00+00:00",
            updated_at: "2026-03-03T10:00:00+00:00",
          },
        ],
      },
    ],
  };
}

function check(file: unknown) {
  const text = JSON.stringify(file);
  return checkExportFile(text.length, text);
}

/** Edits a copy of the valid file and returns the problem lines. */
function problemsAfter(edit: (file: ReturnType<typeof validFile>) => void) {
  const file = validFile();
  edit(file);
  const result = check(file);
  if (result.kind !== "problems") throw new Error(`got ${result.kind}`);
  return result.problems;
}

describe("checkExportFile, in the order of the contract", () => {
  it("accepts a valid file and summarises it", () => {
    const result = check(validFile());
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.summary).toEqual({
        games: 1,
        copies: 1,
        archived: 0,
        changes: 2,
        ratings: 1,
        thoughts: 1,
        covers: 1,
      });
    }
  });

  it("refuses a file over 10 MB from the size alone", () => {
    const result = checkExportFile(IMPORT_MAX_BYTES + 1, null);
    expect(result).toEqual({ kind: "too_large", size: IMPORT_MAX_BYTES + 1 });
    expect(fileMessage(result as never, "big.json")).toBe(
      "“big.json” is 10.0 MB, and the limit is 10 MB. Choose the .json file that Export downloaded.",
    );
  });

  it("says not an export for text that is not JSON, or has no format", () => {
    expect(checkExportFile(5, "hello").kind).toBe("not_export");
    expect(checkExportFile(2, "[]").kind).toBe("not_export");
    expect(check({ games: [] }).kind).toBe("not_export");
    expect(check({ format: "other", version: 1, games: [] }).kind).toBe(
      "not_export",
    );
  });

  it("says newer for a whole version above 1, and not an export for other versions", () => {
    const newer = check({ format: "meeple-journal-export", version: 2 });
    expect(newer).toEqual({ kind: "newer", version: 2 });
    expect(fileMessage(newer as never, "a.json")).toBe(
      "“a.json” was made by a newer version of Meeple Journal (format 2). This version reads format 1 only.",
    );
    for (const version of [0, 1.5, "1", null]) {
      expect(check({ format: "meeple-journal-export", version }).kind).toBe(
        "not_export",
      );
    }
  });

  it("says there are no games for a valid empty file", () => {
    const file = { ...validFile(), games: [] };
    const result = check(file);
    expect(result.kind).toBe("no_games");
    expect(fileMessage(result as never, "a.json")).toBe(
      "“a.json” has no games in it, so there is nothing to import.",
    );
  });
});

describe("problem lines", () => {
  it("names a game with no title by position", () => {
    const { shown } = problemsAfter((f) => {
      f.games[0]!.name = "  ";
    });
    expect(shown).toEqual(["Game 1: the title is missing."]);
  });

  it("covers the game level templates", () => {
    expect(
      problemsAfter((f) => {
        f.games[0]!.name = "x".repeat(201);
      }).shown[0],
    ).toMatch(/^Game “x+”: the title is longer than 200 characters\.$/);
    expect(
      problemsAfter((f) => {
        f.games[0]!.year = 0;
      }).shown,
    ).toEqual(["Game “Wingspan”: the year is outside 1 to 2200."]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.min_players = 6;
      }).shown,
    ).toEqual(["Game “Wingspan”: the player counts are not valid."]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.play_time_min = 0;
      }).shown,
    ).toEqual(["Game “Wingspan”: the play time is not valid."]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.description = "d".repeat(2001);
      }).shown,
    ).toEqual([
      "Game “Wingspan”: the description is longer than 2,000 characters.",
    ]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.kind = "dlc";
      }).shown,
    ).toEqual([
      "Game “Wingspan”: kind “dlc” is not one of base, expansion, standalone expansion.",
    ]);
  });

  it("covers the copy templates", () => {
    expect(
      problemsAfter((f) => {
        f.games[0]!.copies[0]!.status = "lost" as never;
      }).shown[0],
    ).toBe(
      "Game “Wingspan”, copy 1: status “lost” is not one of owned, wishlist, interested, previously owned.",
    );
    expect(
      problemsAfter((f) => {
        f.games[0]!.copies[0]!.history = [];
      }).shown,
    ).toEqual(["Game “Wingspan”, copy 1: it has no status history."]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.copies[0]!.status = "wishlist";
      }).shown,
    ).toEqual([
      "Game “Wingspan”, copy 1: its history does not end in its status (wishlist).",
    ]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.copies[0]!.history[0]!.changed_on = "1800-01-01";
      }).shown,
    ).toEqual([
      "Game “Wingspan”, copy 1: a status change date is outside 1900 to today.",
    ]);
  });

  it("covers the rating and thought templates, with dates as on the game page", () => {
    expect(
      problemsAfter((f) => {
        f.games[0]!.ratings[0]!.overall = 11;
      }).shown,
    ).toEqual([
      "Game “Wingspan”, rating from 2 March 2026: rating 11 is outside 0 to 10.",
    ]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.ratings[0]!.overall = 7.55;
      }).shown,
    ).toEqual([
      "Game “Wingspan”, rating from 2 March 2026: ratings have at most one decimal.",
    ]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.ratings[0]!.assessed_on = "2999-01-01";
      }).shown[0],
    ).toMatch(/: the date is outside 1900 to today\.$/);
    expect(
      problemsAfter((f) => {
        f.games[0]!.thoughts[0]!.body = "   ";
      }).shown,
    ).toEqual([
      "Game “Wingspan”, thought from 3 March 2026: the text is empty.",
    ]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.thoughts[0]!.body = "x".repeat(10_001);
      }).shown,
    ).toEqual([
      "Game “Wingspan”, thought from 3 March 2026: the text is longer than 10,000 characters.",
    ]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.thoughts[0]!.topics = ["mechanics", "nonsense"];
      }).shown,
    ).toEqual([
      "Game “Wingspan”, thought from 3 March 2026: topic “nonsense” is not one of the nine topics.",
    ]);
    expect(
      problemsAfter((f) => {
        f.games[0]!.thoughts[0]!.topics = ["mechanics", "mechanics"];
      }).shown,
    ).toEqual([
      "Game “Wingspan”, thought from 3 March 2026: topic “mechanics” is listed twice.",
    ]);
  });

  it("uses the fallback for anything else", () => {
    const { shown } = problemsAfter((f) => {
      f.games[0]!.copies[0]!.history[1]!.from_status = "owned" as never;
    });
    expect(shown).toEqual(["Game “Wingspan”: copies.0.history is not valid."]);
  });

  it("shows the first five in file order, then how many more", () => {
    const file = validFile();
    file.games = Array.from({ length: 8 }, (_, i) => ({
      ...structuredClone(file.games[0]!),
      name: i < 7 ? `Game ${i}` : "",
      year: 0,
    }));
    const result = check(file);
    if (result.kind !== "problems") throw new Error("expected problems");
    expect(result.problems.total).toBe(9);
    expect(result.problems.shown).toHaveLength(5);
    expect(result.problems.more).toBe(4);
    expect(result.problems.shown[0]).toBe(
      "Game “Game 0”: the year is outside 1 to 2200.",
    );
    expect(fileMessage(result as never, "f.json")).toBe(
      "“f.json” has 9 problems, so nothing can be imported:",
    );
    expect(PROBLEMS_HINT).toContain("fix these");
  });

  it("uses the singular for one problem", () => {
    const file = validFile();
    file.games[0]!.year = 0;
    expect(fileMessage(check(file) as never, "f.json")).toBe(
      "“f.json” has 1 problem, so nothing can be imported:",
    );
  });
});

describe("formatting", () => {
  it("formats sizes in base 1024", () => {
    expect(formatBytes(300)).toBe("1 KB");
    expect(formatBytes(86_016)).toBe("84 KB");
    expect(formatBytes(1_153_434)).toBe("1.1 MB");
  });

  it("leaves out zero items and uses singulars and separators", () => {
    expect(
      countItems({
        games: 1204,
        copies: 1,
        archived: 0,
        changes: 1,
        ratings: 0,
        thoughts: 3018,
      }),
    ).toEqual(["1,204 games", "1 copy", "1 status change", "3,018 thoughts"]);
    expect(
      countItems({
        games: 214,
        copies: 231,
        archived: 9,
        changes: 412,
        ratings: 37,
        thoughts: 52,
      }),
    ).toEqual([
      "214 games",
      "231 copies (9 archived)",
      "412 status changes",
      "37 ratings",
      "52 thoughts",
    ]);
  });

  it("writes the import result with server counts", () => {
    expect(
      importResultSentence({
        games: 1,
        copies: 2,
        archived: 0,
        changes: 3,
        ratings: 1,
        thoughts: 0,
      }),
    ).toBe(
      "This account now has 1 game, 2 copies, 3 status changes, 1 rating and 0 thoughts.",
    );
  });

  it("names the file with the local date and formats calendar days", () => {
    expect(exportFileName(new Date(2026, 10, 3))).toBe(
      "meeple-journal-2026-11-03.json",
    );
    expect(formatDay("2026-03-02")).toBe("2 March 2026");
  });
});

describe("buildExportData", () => {
  const rows: ExportRows = {
    games: [
      {
        id: "g1",
        name: "A",
        year: null,
        min_players: null,
        max_players: null,
        play_time_min: null,
        description: null,
        kind: "base",
        source: "manual",
        created_at: "2026-01-01T00:00:00+00:00",
      },
      {
        id: "g2",
        name: "B",
        year: null,
        min_players: null,
        max_players: null,
        play_time_min: null,
        description: null,
        kind: "base",
        source: "manual",
        created_at: "2026-01-02T00:00:00+00:00",
      },
    ],
    covers: [
      {
        game_id: "g1",
        storage_path: "u/g1/v/cover.webp",
        width: 900,
        height: 1200,
        dominant_color: "#111111",
        accent_color: "#eeeeee",
      },
    ],
    entries: [
      {
        id: "e1",
        game_id: "g1",
        status: "owned",
        archived_at: null,
        acquired_on: null,
        sold_on: null,
        price: null,
        currency: null,
        source: null,
        notes: null,
        created_at: "2026-01-01T00:00:00+00:00",
      },
    ],
    changes: [
      {
        entry_id: "e1",
        from_status: null,
        to_status: "owned",
        changed_on: "2026-01-01",
        recorded_at: "2026-01-01T00:00:00+00:00",
      },
    ],
    ratings: [],
    thoughts: [],
  };

  it("nests rows under their game and keeps cover references only for covered games", () => {
    const file = buildExportData(rows, "2026-11-10T00:00:00Z");
    expect(file.games.map((g) => g.name)).toEqual(["A", "B"]);
    expect(file.games[0]!.cover).toMatchObject({ path: "u/g1/v/cover.webp" });
    expect(file.games[1]!.cover).toBeNull();
    expect(file.games[0]!.copies[0]!.history).toHaveLength(1);
    expect(file.games[1]!.copies).toEqual([]);
    expect(check(file).kind).toBe("ok");
  });
});
