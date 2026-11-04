import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addManualGame, changeEntryStatus } from "@/server/services/collection";
import { getGameDossier, updateGameFacts } from "@/server/services/games";
import {
  admin,
  createTestUser,
  deleteTestUsers,
  insertPublicGame,
  type TestUser,
} from "./helpers";

const noFacts = {
  year: "",
  minPlayers: "",
  maxPlayers: "",
  playTimeMin: "",
  description: "",
};

describe("game page services", () => {
  let a: TestUser;
  let b: TestUser;
  let gameId: string;
  let entryId: string;
  let publicGameId: string;

  beforeAll(async () => {
    a = await createTestUser("page-a");
    b = await createTestUser("page-b");

    const added = await addManualGame(a.client, {
      title: "Wingspan",
      status: "owned",
    });
    if (!added.ok) throw new Error("setup failed");
    entryId = added.data.entryId;
    const entry = await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", entryId)
      .single();
    gameId = entry.data!.game_id;
    publicGameId = await insertPublicGame("Provider game");
  });
  afterAll(async () => {
    await deleteTestUsers();
    await admin.from("games").delete().eq("id", publicGameId);
  });

  describe("getGameDossier", () => {
    it("returns the game and the caller's copies for the owner", async () => {
      const result = await getGameDossier(a.client, a.id, gameId);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.game).toMatchObject({
        id: gameId,
        title: "Wingspan",
        source: "manual",
        editable: true,
        year: null,
      });
      expect(result.data.entries).toEqual([
        { entryId, status: "owned", archived: false },
      ]);
    });

    it("lists several copies, oldest first", async () => {
      const second = await a.client
        .from("collection_entries")
        .insert({ game_id: gameId, status: "wishlist" })
        .select("id")
        .single();
      const result = await getGameDossier(a.client, a.id, gameId);
      expect(result.ok && result.data.entries.map((e) => e.status)).toEqual([
        "owned",
        "wishlist",
      ]);
      await admin.from("collection_entries").delete().eq("id", second.data!.id);
    });

    it("says not_found to B for A's private game", async () => {
      const result = await getGameDossier(b.client, b.id, gameId);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("not_found");
    });

    it("says not_found for unknown ids and for text that is not an id", async () => {
      for (const id of [randomUUID(), "abc", "../etc/passwd", ""]) {
        const result = await getGameDossier(a.client, a.id, id);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("not_found");
      }
    });

    it("shows a public provider game as not editable, with no copies", async () => {
      const result = await getGameDossier(a.client, a.id, publicGameId);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.game.editable).toBe(false);
      expect(result.data.entries).toEqual([]);
    });
  });

  describe("updateGameFacts", () => {
    it("saves the facts of the owner's game", async () => {
      const result = await updateGameFacts(a.client, {
        gameId,
        year: "2019",
        minPlayers: "1",
        maxPlayers: "5",
        playTimeMin: "60",
        description: "Birds and engines.",
      });
      expect(result).toMatchObject({ ok: true, gameId });
      const row = await admin
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();
      expect(row.data).toMatchObject({
        year: 2019,
        min_players: 1,
        max_players: 5,
        play_time_min: 60,
        description: "Birds and engines.",
      });
    });

    it("clears facts when the fields are blank", async () => {
      const result = await updateGameFacts(a.client, { gameId, ...noFacts });
      expect(result).toMatchObject({ ok: true, gameId });
      const row = await admin
        .from("games")
        .select("year, description")
        .eq("id", gameId)
        .single();
      expect(row.data).toEqual({ year: null, description: null });
    });

    it("reports a validation problem with its field and saves nothing", async () => {
      const result = await updateGameFacts(a.client, {
        gameId,
        ...noFacts,
        minPlayers: "4",
        maxPlayers: "2",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("validation");
        expect(result.error.fieldErrors?.maxPlayers).toBe(
          "Maximum players cannot be less than the minimum.",
        );
      }
    });

    it("does not let B edit A's game", async () => {
      const result = await updateGameFacts(b.client, {
        gameId,
        ...noFacts,
        year: "1999",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("not_found");
      const row = await admin
        .from("games")
        .select("year")
        .eq("id", gameId)
        .single();
      expect(row.data?.year).not.toBe(1999);
    });

    it("does not let a user edit a public provider game", async () => {
      const result = await updateGameFacts(a.client, {
        gameId: publicGameId,
        ...noFacts,
        year: "1999",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("not_found");
    });

    it("holds the limits in the database even without the form", async () => {
      const year = await a.client
        .from("games")
        .update({ year: 9999 })
        .eq("id", gameId);
      expect(year.error).not.toBeNull();
      const description = await a.client
        .from("games")
        .update({ description: "x".repeat(2001) })
        .eq("id", gameId);
      expect(description.error).not.toBeNull();
    });
  });

  describe("changeEntryStatus", () => {
    it("moves the owner's entry to another status and back", async () => {
      const toWishlist = await changeEntryStatus(a.client, {
        entryId,
        status: "wishlist",
      });
      expect(toWishlist).toEqual({
        ok: true,
        data: { entryId, status: "wishlist" },
      });
      const back = await changeEntryStatus(a.client, {
        entryId,
        status: "owned",
      });
      expect(back.ok).toBe(true);
    });

    it("does not let B change A's entry", async () => {
      const result = await changeEntryStatus(b.client, {
        entryId,
        status: "wishlist",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("not_found");
      const row = await admin
        .from("collection_entries")
        .select("status")
        .eq("id", entryId)
        .single();
      expect(row.data?.status).toBe("owned");
    });

    it("rejects an invalid status or entry id before the database", async () => {
      for (const input of [
        { entryId, status: "stolen" },
        { entryId: "nope", status: "owned" },
        null,
      ]) {
        const result = await changeEntryStatus(a.client, input);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("validation");
      }
    });

    it("returns not_found for an entry that does not exist", async () => {
      const result = await changeEntryStatus(a.client, {
        entryId: randomUUID(),
        status: "owned",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("not_found");
    });
  });
});
