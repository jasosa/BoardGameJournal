import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonymousClient,
  createTestUser,
  deleteTestUsers,
  insertPublicGame,
  type TestUser,
} from "./helpers";

describe("collection_entries RLS", () => {
  let a: TestUser;
  let b: TestUser;
  let publicGameId: string;
  let bPrivateGameId: string;
  let entryId: string;

  beforeAll(async () => {
    a = await createTestUser("coll-a");
    b = await createTestUser("coll-b");
    publicGameId = await insertPublicGame("Shared catalogue game");

    const priv = await b.client
      .from("games")
      .insert({ name: "B's secret", source: "manual" })
      .select("id")
      .single();
    expect(priv.error).toBeNull();
    bPrivateGameId = priv.data!.id;

    const entry = await a.client
      .from("collection_entries")
      .insert({ game_id: publicGameId, status: "owned" })
      .select("id, user_id")
      .single();
    expect(entry.error).toBeNull();
    expect(entry.data?.user_id).toBe(a.id);
    entryId = entry.data!.id;
  });
  afterAll(async () => {
    await deleteTestUsers();
    await admin.from("games").delete().eq("id", publicGameId);
  });

  it("lets A read their entry and B read nothing of it", async () => {
    const mine = await a.client
      .from("collection_entries")
      .select("id")
      .eq("id", entryId);
    expect(mine.data).toHaveLength(1);
    const theirs = await b.client.from("collection_entries").select("id");
    expect(theirs.data).toEqual([]);
  });

  it("does not let B update A's entry", async () => {
    const { data } = await b.client
      .from("collection_entries")
      .update({ status: "wishlist" })
      .eq("id", entryId)
      .select();
    expect(data).toEqual([]);
    const row = await admin
      .from("collection_entries")
      .select("status")
      .eq("id", entryId)
      .single();
    expect(row.data?.status).toBe("owned");
  });

  it("does not let B delete A's entry", async () => {
    await b.client.from("collection_entries").delete().eq("id", entryId);
    const { data } = await admin
      .from("collection_entries")
      .select("id")
      .eq("id", entryId);
    expect(data).toHaveLength(1);
  });

  it("does not let B insert an entry for A", async () => {
    const { error } = await b.client
      .from("collection_entries")
      .insert({ user_id: a.id, game_id: publicGameId, status: "owned" });
    expect(error).not.toBeNull();
  });

  it("does not let A move their entry to B", async () => {
    const { error } = await a.client
      .from("collection_entries")
      .update({ user_id: b.id })
      .eq("id", entryId);
    expect(error).not.toBeNull();
  });

  it("does not let A attach B's private game", async () => {
    const { error } = await a.client
      .from("collection_entries")
      .insert({ game_id: bPrivateGameId, status: "owned" });
    expect(error).not.toBeNull();
  });

  it("rejects an edition that belongs to another game", async () => {
    const other = await insertPublicGame("Other game");
    const edition = await admin
      .from("game_editions")
      .insert({ game_id: other, name: "Foreign edition" })
      .select("id")
      .single();
    expect(edition.error).toBeNull();
    const { error } = await a.client.from("collection_entries").insert({
      game_id: publicGameId,
      edition_id: edition.data!.id,
      status: "owned",
    });
    expect(error).not.toBeNull();
    await admin.from("games").delete().eq("id", other);
  });

  it("allows several copies of the same game", async () => {
    const { error } = await a.client
      .from("collection_entries")
      .insert({ game_id: publicGameId, status: "owned" });
    expect(error).toBeNull();
  });

  it("rejects invalid status values", async () => {
    const { error } = await a.client
      .from("collection_entries")
      .insert({ game_id: publicGameId, status: "stolen" });
    expect(error).not.toBeNull();
  });

  it("blocks deleting a game that is in a collection", async () => {
    const { error } = await admin.from("games").delete().eq("id", publicGameId);
    expect(error).not.toBeNull();
  });

  it("removes a user's entries when the account is deleted, and leaves others", async () => {
    const c = await createTestUser("coll-c");
    const mine = await c.client
      .from("collection_entries")
      .insert({ game_id: publicGameId, status: "wishlist" });
    expect(mine.error).toBeNull();
    await admin.auth.admin.deleteUser(c.id);
    const gone = await admin
      .from("collection_entries")
      .select("id")
      .eq("user_id", c.id);
    expect(gone.data).toEqual([]);
    const kept = await admin
      .from("collection_entries")
      .select("id")
      .eq("id", entryId);
    expect(kept.data).toHaveLength(1);
  });

  it("gives anonymous visitors nothing", async () => {
    const { data, error } = await anonymousClient()
      .from("collection_entries")
      .select("id");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });
});
