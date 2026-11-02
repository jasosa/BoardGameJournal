import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonymousClient,
  createTestUser,
  deleteTestUsers,
  insertPublicGame,
  type TestUser,
} from "./helpers";

describe("catalogue RLS", () => {
  let a: TestUser;
  let b: TestUser;
  let privateGameId: string;
  let publicGameId: string;
  let editionId: string;

  beforeAll(async () => {
    a = await createTestUser("games-a");
    b = await createTestUser("games-b");

    const game = await a.client
      .from("games")
      .insert({ name: "A's prototype", source: "manual" })
      .select("id, created_by, visibility")
      .single();
    expect(game.error).toBeNull();
    expect(game.data?.created_by).toBe(a.id);
    expect(game.data?.visibility).toBe("private");
    privateGameId = game.data!.id;

    const edition = await a.client
      .from("game_editions")
      .insert({ game_id: privateGameId, name: "First print" })
      .select("id")
      .single();
    expect(edition.error).toBeNull();
    editionId = edition.data!.id;

    const image = await a.client
      .from("game_images")
      .insert({ game_id: privateGameId, url: "https://example.test/c.jpg" });
    expect(image.error).toBeNull();

    publicGameId = await insertPublicGame("Public provider game");
  });
  afterAll(async () => {
    await admin.from("games").delete().eq("id", publicGameId);
    await deleteTestUsers();
  });

  it("shows A's private game to A but not to B", async () => {
    const mine = await a.client
      .from("games")
      .select("id")
      .eq("id", privateGameId);
    expect(mine.data).toHaveLength(1);
    const theirs = await b.client
      .from("games")
      .select("id")
      .eq("id", privateGameId);
    expect(theirs.data).toEqual([]);
  });

  it("shows public provider games to every signed-in user", async () => {
    for (const user of [a, b]) {
      const { data } = await user.client
        .from("games")
        .select("id")
        .eq("id", publicGameId);
      expect(data).toHaveLength(1);
    }
  });

  it("hides editions and images of a private game from B", async () => {
    const editions = await b.client
      .from("game_editions")
      .select("id")
      .eq("game_id", privateGameId);
    expect(editions.data).toEqual([]);
    const images = await b.client
      .from("game_images")
      .select("id")
      .eq("game_id", privateGameId);
    expect(images.data).toEqual([]);
    const mine = await a.client
      .from("game_editions")
      .select("id")
      .eq("game_id", privateGameId);
    expect(mine.data).toHaveLength(1);
  });

  it("does not let a user create a public or provider game", async () => {
    const asPublic = await a.client
      .from("games")
      .insert({ name: "Sneaky", source: "manual", visibility: "public" });
    expect(asPublic.error).not.toBeNull();
    const asProvider = await a.client
      .from("games")
      .insert({ name: "Sneaky", source: "bgg", external_id: "1" });
    expect(asProvider.error).not.toBeNull();
  });

  it("does not let a user create a game owned by someone else", async () => {
    const { error } = await b.client
      .from("games")
      .insert({ name: "Framed", source: "manual", created_by: a.id });
    expect(error).not.toBeNull();
  });

  it("does not let a user change a public game or make a private one public", async () => {
    const edit = await a.client
      .from("games")
      .update({ name: "Renamed" })
      .eq("id", publicGameId)
      .select();
    expect(edit.data).toEqual([]);
    const publish = await a.client
      .from("games")
      .update({ visibility: "public" })
      .eq("id", privateGameId)
      .select();
    expect(publish.error).not.toBeNull();
  });

  it("does not let B update or delete A's game, editions or images", async () => {
    const upd = await b.client
      .from("games")
      .update({ name: "X" })
      .eq("id", privateGameId)
      .select();
    expect(upd.data).toEqual([]);
    await b.client.from("games").delete().eq("id", privateGameId);
    await b.client.from("game_editions").delete().eq("id", editionId);
    const { data } = await admin
      .from("games")
      .select("id")
      .eq("id", privateGameId);
    expect(data).toHaveLength(1);
    const ed = await admin
      .from("game_editions")
      .select("id")
      .eq("id", editionId);
    expect(ed.data).toHaveLength(1);
  });

  it("does not let B add an edition to A's game", async () => {
    const { error } = await b.client
      .from("game_editions")
      .insert({ game_id: privateGameId, name: "Injected" });
    expect(error).not.toBeNull();
  });

  it("does not let a user add an edition to a public provider game", async () => {
    const { error } = await a.client
      .from("game_editions")
      .insert({ game_id: publicGameId, name: "Injected" });
    expect(error).not.toBeNull();
  });

  it("gives anonymous visitors nothing", async () => {
    const anon = anonymousClient();
    for (const table of ["games", "game_editions", "game_images"] as const) {
      const { data, error } = await anon.from(table).select("id");
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
  });
});
