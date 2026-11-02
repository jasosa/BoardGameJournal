import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonymousClient,
  createTestUser,
  deleteTestUsers,
  insertPublicGame,
  type TestUser,
} from "./helpers";

// Cases from the F0.9 security review: privilege escalation, cross-game links,
// provider-id squatting, anonymous access and sign-up routes.
describe("catalogue and collection hardening", () => {
  let a: TestUser;
  let b: TestUser;
  let aGameId: string;
  let aEditionId: string;
  let aImageId: string;
  let bGameId: string;
  let bEditionId: string;
  let publicGameId: string;

  beforeAll(async () => {
    a = await createTestUser("hard-a");
    b = await createTestUser("hard-b");

    const ag = await a.client
      .from("games")
      .insert({ name: "A game", source: "manual" })
      .select("id")
      .single();
    aGameId = ag.data!.id;
    const ae = await a.client
      .from("game_editions")
      .insert({ game_id: aGameId, name: "A edition" })
      .select("id")
      .single();
    expect(ae.error).toBeNull();
    aEditionId = ae.data!.id;
    const ai = await a.client
      .from("game_images")
      .insert({ game_id: aGameId, url: "https://example.test/a.jpg" })
      .select("id")
      .single();
    expect(ai.error).toBeNull();
    aImageId = ai.data!.id;

    const bg = await b.client
      .from("games")
      .insert({ name: "B game", source: "manual" })
      .select("id")
      .single();
    bGameId = bg.data!.id;
    const be = await b.client
      .from("game_editions")
      .insert({ game_id: bGameId, name: "B edition" })
      .select("id")
      .single();
    bEditionId = be.data!.id;

    publicGameId = await insertPublicGame("Hardening public game");
  });
  afterAll(async () => {
    await deleteTestUsers();
    await admin.from("games").delete().eq("id", publicGameId);
  });

  it("does not let A hand their game to B or turn it into a provider row", async () => {
    const toB = await a.client
      .from("games")
      .update({ created_by: b.id })
      .eq("id", aGameId);
    expect(toB.error).not.toBeNull();
    const toProvider = await a.client
      .from("games")
      .update({ source: "bgg" })
      .eq("id", aGameId);
    expect(toProvider.error).not.toBeNull();
  });

  it("does not let A squat a provider id on an edition", async () => {
    const insert = await a.client.from("game_editions").insert({
      game_id: aGameId,
      name: "Squat",
      source: "bgg",
      external_id: "12345",
    });
    expect(insert.error).not.toBeNull();
    const update = await a.client
      .from("game_editions")
      .update({ source: "bgg", external_id: "12345" })
      .eq("id", aEditionId);
    expect(update.error).not.toBeNull();
  });

  it("lets manual editions repeat names and ids without colliding", async () => {
    const { error } = await a.client
      .from("game_editions")
      .insert({ game_id: aGameId, name: "A edition" });
    expect(error).toBeNull();
  });

  it("does not let B update or delete A's edition or image", async () => {
    const ed = await b.client
      .from("game_editions")
      .update({ name: "X" })
      .eq("id", aEditionId)
      .select();
    expect(ed.data).toEqual([]);
    const img = await b.client
      .from("game_images")
      .update({ kind: "box" })
      .eq("id", aImageId)
      .select();
    expect(img.data).toEqual([]);
    await b.client.from("game_images").delete().eq("id", aImageId);
    const still = await admin
      .from("game_images")
      .select("id")
      .eq("id", aImageId);
    expect(still.data).toHaveLength(1);
  });

  it("does not let B move their edition into A's game", async () => {
    const { error } = await b.client
      .from("game_editions")
      .update({ game_id: aGameId })
      .eq("id", bEditionId);
    expect(error).not.toBeNull();
  });

  it("does not let an image point at an edition of another game", async () => {
    const { error } = await a.client.from("game_images").insert({
      game_id: aGameId,
      edition_id: bEditionId,
      url: "https://example.test/x.jpg",
    });
    expect(error).not.toBeNull();
  });

  it("rejects non-https image urls", async () => {
    const { error } = await a.client
      .from("game_images")
      .insert({ game_id: aGameId, url: "javascript:alert(1)" });
    expect(error).not.toBeNull();
  });

  it("does not let A repoint an existing entry at B's game or a foreign edition", async () => {
    const entry = await a.client
      .from("collection_entries")
      .insert({ game_id: publicGameId, status: "owned" })
      .select("id")
      .single();
    expect(entry.error).toBeNull();
    const toGame = await a.client
      .from("collection_entries")
      .update({ game_id: bGameId })
      .eq("id", entry.data!.id);
    expect(toGame.error).not.toBeNull();
    const toEdition = await a.client
      .from("collection_entries")
      .update({ edition_id: bEditionId })
      .eq("id", entry.data!.id);
    expect(toEdition.error).not.toBeNull();
  });

  it("keeps a game while it is in the owner's own collection", async () => {
    const entry = await a.client
      .from("collection_entries")
      .insert({ game_id: aGameId, status: "owned" });
    expect(entry.error).toBeNull();
    await a.client.from("games").delete().eq("id", aGameId);
    const { data } = await admin.from("games").select("id").eq("id", aGameId);
    expect(data).toHaveLength(1);
  });

  it("deletes an account whose collection holds its own private game", async () => {
    const c = await createTestUser("hard-c");
    const game = await c.client
      .from("games")
      .insert({ name: "C game", source: "manual" })
      .select("id")
      .single();
    await c.client
      .from("collection_entries")
      .insert({ game_id: game.data!.id, status: "owned" });
    const { error } = await admin.auth.admin.deleteUser(c.id);
    expect(error).toBeNull();
    const left = await admin.from("games").select("id").eq("id", game.data!.id);
    expect(left.data).toEqual([]);
  });
});

describe("anonymous access and sign-up routes", () => {
  it("denies anonymous reads with a permission error on every table", async () => {
    const anon = anonymousClient();
    for (const table of [
      "profiles",
      "games",
      "game_editions",
      "game_images",
      "collection_entries",
    ] as const) {
      const { error } = await anon.from(table).select("*");
      expect(error?.code, table).toBe("42501");
    }
  });

  it("rejects public sign-up with signup_disabled", async () => {
    const { error } = await anonymousClient().auth.signUp({
      email: `walkin2-${Date.now()}@test.local`,
      password: "a-long-enough-password",
    });
    expect(error?.code).toBe("signup_disabled");
  });

  it("does not create users through a one-time-code request", async () => {
    const email = `otp-${Date.now()}@test.local`;
    const { error } = await anonymousClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    expect(error).not.toBeNull();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((u) => u.email === email)).toBe(false);
  });
});
