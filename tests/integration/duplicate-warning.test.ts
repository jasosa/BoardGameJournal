import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addGameCopy,
  addManualGame,
  findTitleMatches,
} from "@/server/services/collection";
import { getGameDossier } from "@/server/services/games";
import {
  admin,
  anonymousClient,
  createTestUser,
  deleteTestUsers,
  insertPublicGame,
  type TestUser,
} from "./helpers";

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe("duplicate warning: findTitleMatches + add_game_copy", () => {
  let a: TestUser;
  let b: TestUser;
  let gameId: string;

  beforeAll(async () => {
    a = await createTestUser("dup-a");
    b = await createTestUser("dup-b");
    const added = await addManualGame(a.client, {
      title: "Carcassonne",
      status: "owned",
    });
    if (!added.ok) throw new Error("setup failed");
    const row = await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", added.data.entryId)
      .single();
    gameId = row.data!.game_id as string;
  });
  afterAll(deleteTestUsers);

  it("finds a game written differently", async () => {
    const result = await findTitleMatches(a.client, a.id, "  carcassoñne! ");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      { gameId, title: "Carcassonne", status: "owned", archived: false },
    ]);
  });

  it("finds nothing for a different title or an empty one", async () => {
    for (const title of ["Carcassonne: Hunters", "", "  "]) {
      const result = await findTitleMatches(a.client, a.id, title);
      expect(result.ok && result.data).toEqual([]);
    }
  });

  it("never returns another person's game", async () => {
    const result = await findTitleMatches(b.client, b.id, "Carcassonne");
    expect(result.ok && result.data).toEqual([]);
  });

  it("adds another copy on the same game, with the given date", async () => {
    const result = await addGameCopy(a.client, {
      gameId,
      status: "wishlist",
      addedOn: "2024-05-01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const history = await a.client
      .from("collection_status_changes")
      .select("from_status, to_status, changed_on")
      .eq("entry_id", result.data.entryId);
    expect(history.data).toEqual([
      { from_status: null, to_status: "wishlist", changed_on: "2024-05-01" },
    ]);

    const dossier = await getGameDossier(a.client, a.id, gameId);
    expect(dossier.ok && dossier.data.entries).toHaveLength(2);
    const games = await admin
      .from("games")
      .select("id")
      .eq("name", "Carcassonne")
      .eq("created_by", a.id);
    expect(games.data).toHaveLength(1);
  });

  it("reports the status of the newest copy", async () => {
    const result = await findTitleMatches(a.client, a.id, "Carcassonne");
    expect(result.ok && result.data[0]?.status).toBe("wishlist");
  });

  it("refuses a future date and a bad status, and saves nothing", async () => {
    const before = await admin
      .from("collection_entries")
      .select("id")
      .eq("user_id", a.id);
    const future = await addGameCopy(a.client, {
      gameId,
      status: "owned",
      addedOn: daysFromNow(3),
    });
    expect(future.ok).toBe(false);
    const bad = await addGameCopy(a.client, { gameId, status: "nope" });
    expect(bad.ok).toBe(false);
    const after = await admin
      .from("collection_entries")
      .select("id")
      .eq("user_id", a.id);
    expect(after.data).toHaveLength(before.data!.length);
  });

  it("refuses the database call with a future date even without the service", async () => {
    const { error } = await a.client.rpc("add_game_copy", {
      p_game_id: gameId,
      p_status: "owned",
      p_added_on: daysFromNow(3),
    });
    expect(error?.message).toContain("invalid_date");
  });

  it("cannot add a copy of someone else's private game", async () => {
    const result = await addGameCopy(b.client, { gameId, status: "owned" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
    const rows = await admin
      .from("collection_entries")
      .select("id")
      .eq("user_id", b.id);
    expect(rows.data).toEqual([]);
  });

  it("cannot add a copy of a game that does not exist", async () => {
    const result = await addGameCopy(a.client, {
      gameId: "00000000-0000-4000-8000-000000000000",
      status: "owned",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });

  it("is closed to anonymous visitors", async () => {
    const { error } = await anonymousClient().rpc("add_game_copy", {
      p_game_id: gameId,
      p_status: "owned",
    });
    expect(error).not.toBeNull();
  });

  it("pins the same error codes for a hidden game and a missing one", async () => {
    const hidden = await b.client.rpc("add_game_copy", {
      p_game_id: gameId,
      p_status: "owned",
    });
    const missing = await b.client.rpc("add_game_copy", {
      p_game_id: "00000000-0000-4000-8000-000000000000",
      p_status: "owned",
    });
    expect(hidden.error?.code).toBe(missing.error?.code);
    expect(["42501", "23503"]).toContain(hidden.error?.code);
    const history = await admin
      .from("collection_status_changes")
      .select("id")
      .eq("user_id", b.id);
    expect(history.data).toEqual([]);
  });

  it("can add a copy of a public game, and the other person cannot see it", async () => {
    const publicId = await insertPublicGame("Public Provider Game");
    const result = await addGameCopy(b.client, {
      gameId: publicId,
      status: "interested",
    });
    expect(result.ok).toBe(true);
    const seenByA = await a.client
      .from("collection_entries")
      .select("id")
      .eq("game_id", publicId);
    expect(seenByA.data).toEqual([]);
  });
});
