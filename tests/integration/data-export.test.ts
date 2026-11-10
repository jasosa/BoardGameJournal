import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { exportFileSchema } from "@/features/export/schemas";
import {
  buildExport,
  getDataSummary,
  importAccount,
} from "@/server/services/data-export";
import {
  admin,
  anonymousClient,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

/** Calls a database function as the user and fails the test setup on an error. */
async function rpc(
  user: TestUser,
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await user.client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

/** A game with a changing status, a second copy, ratings, thoughts and one archived copy. */
async function seedLibrary(user: TestUser, tag: string) {
  const wing = await rpc(user, "add_manual_game", {
    p_title: `${tag} Wingspan`,
    p_status: "wishlist",
    p_added_on: daysAgo(300),
  });
  await rpc(user, "change_entry_status", {
    p_entry_id: wing,
    p_status: "owned",
    p_changed_on: daysAgo(250),
  });
  await rpc(user, "change_entry_status", {
    p_entry_id: wing,
    p_status: "previously_owned",
    p_changed_on: daysAgo(100),
  });
  const gameId = (
    await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", wing)
      .single()
  ).data!.game_id as string;
  await user.client
    .from("games")
    .update({ year: 2019, min_players: 1, max_players: 5, play_time_min: 70 })
    .eq("id", gameId);
  await rpc(user, "add_game_copy", {
    p_game_id: gameId,
    p_status: "owned",
    p_added_on: daysAgo(90),
  });
  await rpc(user, "add_assessment", {
    p_game_id: gameId,
    p_overall: 7.5,
    p_assessed_on: daysAgo(200),
  });
  await rpc(user, "add_assessment", {
    p_game_id: gameId,
    p_overall: 8.5,
    p_assessed_on: daysAgo(20),
  });
  await rpc(user, "add_thought", {
    p_game_id: gameId,
    p_body: "The bird cards are gorgeous, with “quotes” and ünïcode.",
    p_topics: ["artwork", "mechanics"],
    p_written_on: daysAgo(150),
  });
  await rpc(user, "add_thought", {
    p_game_id: gameId,
    p_body: "No topics here.",
    p_topics: [],
    p_written_on: daysAgo(10),
  });

  const root = await rpc(user, "add_manual_game", {
    p_title: `${tag} Root`,
    p_status: "owned",
    p_added_on: daysAgo(60),
  });
  await rpc(user, "archive_entry", { p_entry_id: root });
  const rootGame = (
    await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", root)
      .single()
  ).data!.game_id as string;
  // A cover reference, so the file notes it. Files are not exported.
  await admin.from("game_images").insert({
    game_id: rootGame,
    kind: "cover",
    storage_path: `${user.id}/${rootGame}/v1/cover.webp`,
    width: 900,
    height: 1200,
    licence: "own-upload",
    dominant_color: "#223344",
    accent_color: "#ccddee",
  });
  await rpc(user, "add_manual_game", {
    p_title: `${tag} Azul`,
    p_status: "interested",
    p_added_on: daysAgo(5),
  });
  return { gameId };
}

/** The file with the parts that may differ between accounts removed. */
function stable(text: string) {
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([key]) => !["id", "exported_at", "cover"].includes(key))
          .map(([key, v]) => [key, strip(v)]),
      );
    }
    return value;
  };
  return strip(JSON.parse(text));
}

async function exportOf(user: TestUser) {
  const result = await buildExport(user.client, user.id);
  if (!result.ok) throw new Error(result.error.message);
  return result.data.text;
}

describe("export and import", () => {
  let a: TestUser;
  let b: TestUser;
  let c: TestUser;
  let fileA: string;

  beforeAll(async () => {
    a = await createTestUser("export-a");
    b = await createTestUser("export-b");
    c = await createTestUser("export-c");
    await seedLibrary(a, "A");
    await seedLibrary(c, "C");
    fileA = await exportOf(a);
  });
  afterAll(deleteTestUsers);

  it("exports a file that passes the shared schema, indented, with a cover reference", async () => {
    expect(fileA).toContain('\n  "format": "meeple-journal-export"');
    const parsed = exportFileSchema.safeParse(JSON.parse(fileA));
    expect(parsed.success).toBe(true);
    const file = JSON.parse(fileA);
    expect(file.games.map((g: { name: string }) => g.name)).toEqual([
      "A Wingspan",
      "A Root",
      "A Azul",
    ]);
    const wing = file.games[0];
    expect(wing.copies).toHaveLength(2);
    expect(wing.copies[0].history).toHaveLength(3);
    expect(wing.ratings).toHaveLength(2);
    expect(wing.thoughts).toHaveLength(2);
    expect(file.games[1].cover).toMatchObject({ width: 900, height: 1200 });
    expect(file.games[1].copies[0].archived_at).not.toBeNull();
    expect(wing.cover).toBeNull();
  });

  it("never holds another person's data", async () => {
    expect(fileA).not.toContain("C Wingspan");
    expect(fileA).not.toContain(c.id);
    const summary = await getDataSummary(a.client, a.id);
    expect(summary.ok && summary.data).toMatchObject({
      games: 3,
      copies: 4,
      archived: 1,
      ratings: 2,
      thoughts: 2,
      empty: false,
    });
  });

  it("round-trips: export A, import into empty B, export B", async () => {
    const before = await getDataSummary(b.client, b.id);
    expect(before.ok && before.data.empty).toBe(true);

    const imported = await importAccount(b.client, fileA);
    expect(imported).toEqual({
      ok: true,
      data: {
        games: 3,
        copies: 4,
        archived: 1,
        changes: 6,
        ratings: 2,
        thoughts: 2,
      },
    });

    const fileB = await exportOf(b);
    expect(stable(fileB)).toEqual(stable(fileA));
    // Covers are not copied, and ids are new.
    const parsedB = JSON.parse(fileB);
    expect(
      parsedB.games.every((g: { cover: unknown }) => g.cover === null),
    ).toBe(true);
    const idsA = new Set(
      JSON.parse(fileA).games.map((g: { id: string }) => g.id),
    );
    expect(parsedB.games.some((g: { id: string }) => idsA.has(g.id))).toBe(
      false,
    );
  });

  it("writes the rows for the signed-in person only, as private manual games", async () => {
    const games = await admin
      .from("games")
      .select("created_by, source, visibility")
      .in(
        "id",
        (
          await admin
            .from("collection_entries")
            .select("game_id")
            .eq("user_id", b.id)
        ).data!.map((e) => e.game_id),
      );
    expect(games.data!.length).toBeGreaterThan(0);
    for (const g of games.data!) {
      expect(g).toEqual({
        created_by: b.id,
        source: "manual",
        visibility: "private",
      });
    }
    // A's data is untouched.
    const again = await exportOf(a);
    expect(stable(again)).toEqual(stable(fileA));
  });

  it("keeps the original dates and timestamps", async () => {
    const original = JSON.parse(fileA).games[0];
    const copy = (
      await b.client
        .from("collection_entries")
        .select("created_at, archived_at")
        .order("created_at")
        .limit(1)
        .single()
    ).data!;
    expect(new Date(copy.created_at).getTime()).toBe(
      new Date(original.copies[0].created_at).getTime(),
    );
    const thought = (
      await b.client
        .from("journal_entries")
        .select("created_at, written_on")
        .eq("written_on", daysAgo(150))
        .single()
    ).data!;
    expect(new Date(thought.created_at).getTime()).toBe(
      new Date(original.thoughts[0].created_at).getTime(),
    );
  });

  it("refuses an account that already has data, and changes nothing", async () => {
    const result = await importAccount(b.client, fileA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_empty");
    expect(stable(await exportOf(b))).toEqual(stable(fileA));
  });

  it("refuses an account with only one game of its own", async () => {
    const d = await createTestUser("export-d");
    await rpc(d, "add_manual_game", { p_title: "Only", p_status: "owned" });
    const result = await importAccount(d.client, fileA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_empty");
  });

  it("is all or nothing when the database refuses a row in the middle", async () => {
    const e = await createTestUser("export-e");
    const file = JSON.parse(fileA);
    // Passes the file check but breaks a table rule on the last game: a thought longer than the
    // database allows, written straight to the function (the service would refuse it first).
    file.games[2].thoughts = [
      {
        body: "x".repeat(10_001),
        topics: [],
        written_on: daysAgo(1),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    const { error } = await e.client.rpc("import_account", { p_data: file });
    expect(error).not.toBeNull();
    const summary = await getDataSummary(e.client, e.id);
    expect(summary.ok && summary.data).toMatchObject({
      games: 0,
      copies: 0,
      changes: 0,
      ratings: 0,
      thoughts: 0,
      empty: true,
    });
  });

  it("refuses a history that does not end in the copy's status", async () => {
    const f = await createTestUser("export-f");
    const file = JSON.parse(fileA);
    file.games[0].copies[0].status = "wishlist";
    const { error } = await f.client.rpc("import_account", { p_data: file });
    expect(error?.message).toContain("invalid_file");
    const summary = await getDataSummary(f.client, f.id);
    expect(summary.ok && summary.data.empty).toBe(true);
  });

  it("clears the import flag, so normal adds behave as before afterwards", async () => {
    const entry = await rpc(b, "add_manual_game", {
      p_title: "After import",
      p_status: "owned",
      p_added_on: daysAgo(2),
    });
    const history = await b.client
      .from("collection_status_changes")
      .select("changed_on, from_status")
      .eq("entry_id", entry);
    expect(history.data).toEqual([
      { changed_on: daysAgo(2), from_status: null },
    ]);
    const game = (
      await admin
        .from("collection_entries")
        .select("game_id")
        .eq("id", entry)
        .single()
    ).data!.game_id as string;
    await rpc(b, "add_thought", {
      p_game_id: game,
      p_body: "Fresh",
      p_topics: [],
      p_written_on: daysAgo(0),
    });
    const thought = (
      await b.client
        .from("journal_entries")
        .select("created_at")
        .eq("game_id", game)
        .single()
    ).data!;
    expect(Date.now() - new Date(thought.created_at).getTime()).toBeLessThan(
      60_000,
    );
  });

  it("cannot be called without signing in", async () => {
    const { error } = await anonymousClient().rpc("import_account", {
      p_data: JSON.parse(fileA),
    });
    expect(error).not.toBeNull();
  });

  it("ignores owners and visibility in the payload and refuses other sources", async () => {
    const h = await createTestUser("export-hostile");
    const file = JSON.parse(fileA);
    file.user_id = a.id;
    for (const game of file.games) {
      game.created_by = a.id;
      game.user_id = a.id;
      game.visibility = "public";
      for (const copy of game.copies) copy.user_id = a.id;
    }
    const ok = await h.client.rpc("import_account", { p_data: file });
    expect(ok.error).toBeNull();
    const games = await admin
      .from("games")
      .select("created_by, visibility, source")
      .eq("created_by", h.id);
    expect(games.data).toHaveLength(3);
    for (const game of games.data!) {
      expect(game).toMatchObject({ visibility: "private", source: "manual" });
    }
    const leaked = await admin
      .from("collection_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", a.id);
    // A still has exactly its own four copies.
    expect(leaked.count).toBe(4);

    const other = await createTestUser("export-other-source");
    const bgg = JSON.parse(fileA);
    bgg.games[0].source = "bgg";
    const refused = await other.client.rpc("import_account", { p_data: bgg });
    expect(refused.error?.message).toContain("invalid_file");
  });

  it("refuses infinite and out-of-range dates sent straight to the function", async () => {
    const cases: [string, (file: ReturnType<typeof JSON.parse>) => void][] = [
      [
        "infinite recorded_at",
        (f) => (f.games[0].copies[0].history[0].recorded_at = "infinity"),
      ],
      [
        "future created_at",
        (f) => (f.games[0].created_at = "3000-01-01T00:00:00Z"),
      ],
      [
        "future changed_on",
        (f) => (f.games[0].copies[0].history[0].changed_on = "2999-01-01"),
      ],
      [
        "negative infinite archived_at",
        (f) => (f.games[1].copies[0].archived_at = "-infinity"),
      ],
      [
        "old rating date",
        (f) => (f.games[0].ratings[0].assessed_on = "1800-01-01"),
      ],
      [
        "thought updated before created",
        (f) => {
          f.games[0].thoughts[0].updated_at = "2000-01-01T00:00:00Z";
        },
      ],
      ["future sold_on", (f) => (f.games[0].copies[0].sold_on = "2999-01-01")],
    ];
    for (const [label, edit] of cases) {
      const user = await createTestUser("export-dates");
      const file = JSON.parse(fileA);
      edit(file);
      const { error } = await user.client.rpc("import_account", {
        p_data: file,
      });
      expect(error, label).not.toBeNull();
      const summary = await getDataSummary(user.client, user.id);
      expect(summary.ok && summary.data.empty, label).toBe(true);
    }
  });

  it("keeps the guards for ordinary inserts outside an import", async () => {
    const game = (
      await b.client
        .from("collection_entries")
        .select("game_id")
        .limit(1)
        .single()
    ).data!.game_id as string;
    const rating = await b.client
      .from("assessments")
      .insert({ game_id: game, overall: 5, created_at: "2000-01-01T00:00:00Z" })
      .select("created_at")
      .single();
    expect(rating.error).toBeNull();
    expect(
      Date.now() - new Date(rating.data!.created_at).getTime(),
    ).toBeLessThan(60_000);
    const thought = await b.client
      .from("journal_entries")
      .insert({
        game_id: game,
        body: "Direct",
        created_at: "2000-01-01T00:00:00Z",
        updated_at: "2000-01-01T00:00:00Z",
      })
      .select("created_at, updated_at")
      .single();
    expect(thought.error).toBeNull();
    expect(
      Date.now() - new Date(thought.data!.created_at).getTime(),
    ).toBeLessThan(60_000);
    expect(
      Date.now() - new Date(thought.data!.updated_at).getTime(),
    ).toBeLessThan(60_000);
  });

  it("reads past the 1,000-row page limit", async () => {
    const g = await createTestUser("export-big");
    const entry = await rpc(g, "add_manual_game", {
      p_title: "Big",
      p_status: "owned",
    });
    const gameId = (
      await admin
        .from("collection_entries")
        .select("game_id")
        .eq("id", entry)
        .single()
    ).data!.game_id as string;
    const rows = Array.from({ length: 1_100 }, (_, i) => ({
      user_id: g.id,
      game_id: gameId,
      body: `Thought ${i}`,
      topics: [],
      written_on: daysAgo(1),
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin
        .from("journal_entries")
        .insert(rows.slice(i, i + 500));
      expect(error).toBeNull();
    }
    const file = JSON.parse(await exportOf(g));
    expect(file.games[0].thoughts).toHaveLength(1_100);
  });
});
