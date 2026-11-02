import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changeEntryStatus } from "@/server/services/collection";
import { getGameDossier, updateGameFacts } from "@/server/services/games";
import {
  admin,
  createTestUser,
  deleteTestUsers,
  insertPublicGame,
  type TestUser,
} from "./helpers";

// Cases from the L5 security review: provenance columns, provider ids, shared catalogue rows.
describe("games provenance and shared rows", () => {
  let a: TestUser;
  let b: TestUser;
  let aGameId: string;
  let publicGameId: string;
  let aPublicEntryId: string;
  const createdProviderIds: string[] = [];

  beforeAll(async () => {
    a = await createTestUser("prov-a");
    b = await createTestUser("prov-b");
    const game = await a.client
      .from("games")
      .insert({ name: "A's game", source: "manual" })
      .select("id")
      .single();
    aGameId = game.data!.id;
    publicGameId = await insertPublicGame("Shared provider game");
    const entry = await a.client
      .from("collection_entries")
      .insert({ game_id: publicGameId, status: "owned" })
      .select("id")
      .single();
    aPublicEntryId = entry.data!.id;
  });
  afterAll(async () => {
    await deleteTestUsers();
    await admin
      .from("games")
      .delete()
      .in("id", [publicGameId, ...createdProviderIds]);
  });

  it("ignores extra keys, so ownership and visibility cannot be changed through the service", async () => {
    const result = await updateGameFacts(a.client, {
      gameId: aGameId,
      year: "",
      minPlayers: "",
      maxPlayers: "",
      playTimeMin: "",
      description: "",
      visibility: "public",
      created_by: b.id,
      source: "bgg",
      external_id: "x",
    });
    expect(result.ok).toBe(true);
    const row = await admin
      .from("games")
      .select("visibility, created_by, source, external_id")
      .eq("id", aGameId)
      .single();
    expect(row.data).toEqual({
      visibility: "private",
      created_by: a.id,
      source: "manual",
      external_id: null,
    });
  });

  it("does not let a user write provenance or bookkeeping columns, even on their own game", async () => {
    for (const patch of [
      { created_at: "2000-01-01T00:00:00Z" },
      { attribution: "Faked attribution" },
      { source_url: "https://example.test/fake" },
      { external_id: "faked" },
      { fetched_at: "2000-01-01T00:00:00Z" },
    ]) {
      const { error } = await a.client
        .from("games")
        .update(patch)
        .eq("id", aGameId);
      expect(error, JSON.stringify(patch)).not.toBeNull();
    }
    const row = await admin
      .from("games")
      .select("attribution, external_id")
      .eq("id", aGameId)
      .single();
    expect(row.data).toEqual({ attribution: null, external_id: null });
  });

  it("still lets a user edit the facts columns", async () => {
    const { error } = await a.client
      .from("games")
      .update({ name: "A's game, renamed", year: 2001, description: "ok" })
      .eq("id", aGameId);
    expect(error).toBeNull();
  });

  it("lets two users hold manual games with the same external id, and tells neither about the other", async () => {
    const shared = randomUUID();
    const first = await a.client
      .from("games")
      .insert({ name: "One", source: "manual", external_id: shared });
    const second = await b.client
      .from("games")
      .insert({ name: "Two", source: "manual", external_id: shared });
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
  });

  it("keeps provider ids unique among provider rows", async () => {
    const externalId = randomUUID();
    const first = await admin
      .from("games")
      .insert({
        name: "P1",
        source: "test-provider",
        external_id: externalId,
        visibility: "public",
        created_by: null,
      })
      .select("id")
      .single();
    expect(first.error).toBeNull();
    createdProviderIds.push(first.data!.id);
    const duplicate = await admin.from("games").insert({
      name: "P2",
      source: "test-provider",
      external_id: externalId,
      visibility: "public",
      created_by: null,
    });
    expect(duplicate.error).not.toBeNull();
  });

  it("accepts provider years the form would refuse, but not for manual games", async () => {
    const provider = await admin
      .from("games")
      .insert({
        name: "Ancient game",
        source: "test-provider",
        external_id: randomUUID(),
        visibility: "public",
        created_by: null,
        year: -2000,
        description: "x".repeat(5000),
      })
      .select("id")
      .single();
    expect(provider.error).toBeNull();
    createdProviderIds.push(provider.data!.id);

    const manual = await a.client
      .from("games")
      .update({ year: 0 })
      .eq("id", aGameId);
    expect(manual.error).not.toBeNull();
    const long = await a.client
      .from("games")
      .update({ description: "x".repeat(2001) })
      .eq("id", aGameId);
    expect(long.error).not.toBeNull();
  });

  it("does not show A's copies on B's page for the same public game", async () => {
    const result = await getGameDossier(b.client, b.id, publicGameId);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.entries).toEqual([]);
  });

  it("does not let B change the status of A's copy of a public game", async () => {
    const result = await changeEntryStatus(b.client, {
      entryId: aPublicEntryId,
      status: "wishlist",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
    const row = await admin
      .from("collection_entries")
      .select("status")
      .eq("id", aPublicEntryId)
      .single();
    expect(row.data?.status).toBe("owned");
  });

  it("leaves every fact unchanged when B tries to edit A's game", async () => {
    await a.client
      .from("games")
      .update({ year: 2010, description: "Mine" })
      .eq("id", aGameId);
    const result = await updateGameFacts(b.client, {
      gameId: aGameId,
      year: "1999",
      minPlayers: "3",
      maxPlayers: "4",
      playTimeMin: "30",
      description: "Overwritten",
    });
    expect(result.ok).toBe(false);
    const row = await admin
      .from("games")
      .select("year, min_players, max_players, play_time_min, description")
      .eq("id", aGameId)
      .single();
    expect(row.data).toEqual({
      year: 2010,
      min_players: null,
      max_players: null,
      play_time_min: null,
      description: "Mine",
    });
  });
});
