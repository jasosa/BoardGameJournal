import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  archiveEntry,
  addManualGame,
  deleteEntry,
} from "@/server/services/collection";
import {
  addThought,
  deleteThought,
  listThoughts,
  updateThought,
} from "@/server/services/thoughts";
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

describe("thoughts", () => {
  let a: TestUser;
  let b: TestUser;

  async function newGame(user: TestUser, title: string) {
    const added = await addManualGame(user.client, { title, status: "owned" });
    if (!added.ok) throw new Error("setup failed");
    const row = await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", added.data.entryId)
      .single();
    return { entryId: added.data.entryId, gameId: row.data!.game_id as string };
  }

  const write = async (user: TestUser, gameId: string, extra = {}) => {
    const result = await addThought(user.client, {
      gameId,
      body: "A thought.",
      topics: [],
      ...extra,
    });
    if (!result.ok) throw new Error(`thought failed: ${result.error.message}`);
    return result.thoughtId;
  };

  const rows = async (gameId: string) =>
    (await admin.from("journal_entries").select("*").eq("game_id", gameId))
      .data ?? [];

  beforeAll(async () => {
    a = await createTestUser("thought-a");
    b = await createTestUser("thought-b");
  });
  afterAll(deleteTestUsers);

  it("adds a thought with topics and lists it", async () => {
    const { gameId } = await newGame(a, "Wingspan");
    const id = await write(a, gameId, {
      body: "  The bird cards are gorgeous.  ",
      topics: ["artwork", "mechanics", "artwork"],
    });

    const list = await listThoughts(a.client, a.id, gameId);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({
      id,
      gameId,
      body: "The bird cards are gorgeous.",
      topics: ["mechanics", "artwork"],
    });
    expect(list.data[0]!.writtenOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("lists newest first by date written, then by when it was saved", async () => {
    const { gameId } = await newGame(a, "Azul");
    const old = await write(a, gameId, { writtenOn: "2024-01-10" });
    const mid = await write(a, gameId, { writtenOn: "2024-06-01" });
    const late = await write(a, gameId, { writtenOn: "2024-06-01" });
    const list = await listThoughts(a.client, a.id, gameId);
    expect(list.ok && list.data.map((item) => item.id)).toEqual([
      late,
      mid,
      old,
    ]);
  });

  it("refuses empty text, too long text and unknown or repeated topics, everywhere", async () => {
    const { gameId } = await newGame(a, "Heat");
    const empty = await addThought(a.client, { gameId, body: "  " });
    expect(empty).toMatchObject({
      ok: false,
      error: { code: "validation", fieldErrors: { body: expect.any(String) } },
    });
    const long = await addThought(a.client, {
      gameId,
      body: "x".repeat(10_001),
    });
    expect(long).toMatchObject({ ok: false, error: { code: "validation" } });
    const unknown = await addThought(a.client, {
      gameId,
      body: "ok",
      topics: ["humour"],
    });
    expect(unknown).toMatchObject({ ok: false, error: { code: "validation" } });

    // The database refuses the same things when the service is skipped.
    for (const params of [
      { p_body: "   " },
      { p_body: "x".repeat(10_001) },
      { p_body: "ok", p_topics: ["humour"] },
      { p_body: "ok", p_topics: ["theme", "theme"] },
      { p_body: "ok", p_topics: ["Theme"] },
    ]) {
      const { error } = await a.client.rpc("add_thought", {
        p_game_id: gameId,
        ...params,
      });
      expect(error, JSON.stringify(params)).not.toBeNull();
    }
    const exact = await a.client.rpc("add_thought", {
      p_game_id: gameId,
      p_body: "x".repeat(10_000),
    });
    expect(exact.error).toBeNull();
    expect(await rows(gameId)).toHaveLength(1);
  });

  it("another person cannot read thoughts", async () => {
    const { gameId } = await newGame(a, "Private Game");
    const id = await write(a, gameId);

    const list = await listThoughts(b.client, b.id, gameId);
    expect(list.ok && list.data).toEqual([]);
    const direct = await b.client
      .from("journal_entries")
      .select("id")
      .eq("id", id);
    expect(direct.data).toEqual([]);
  });

  it("cannot write about a game that is not visible, or does not exist", async () => {
    const { gameId } = await newGame(a, "Hidden From B");
    const hidden = await addThought(b.client, { gameId, body: "Hello" });
    expect(hidden).toMatchObject({ ok: false, error: { code: "not_found" } });
    const missing = await addThought(b.client, {
      gameId: randomUUID(),
      body: "Hello",
    });
    expect(missing).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(await rows(gameId)).toHaveLength(0);
  });

  it("can write about a public game without owning it", async () => {
    const gameId = await insertPublicGame("Catalogue Game");
    expect(await write(b, gameId)).toBeTruthy();
  });

  it("cannot insert as someone else, with a far date, or choosing created_at", async () => {
    const { gameId } = await newGame(a, "Spoof Target");
    const spoof = await b.client
      .from("journal_entries")
      .insert({ user_id: a.id, game_id: gameId, body: "x" });
    expect(spoof.error).not.toBeNull();

    for (const written_on of ["9999-12-31", "1800-01-01", daysFromNow(5)]) {
      const { error } = await a.client
        .from("journal_entries")
        .insert({ game_id: gameId, body: "x", written_on });
      expect(error).not.toBeNull();
    }
    expect(await rows(gameId)).toHaveLength(0);

    const { error } = await a.client.from("journal_entries").insert({
      game_id: gameId,
      body: "x",
      created_at: "2000-01-01T00:00:00Z",
    });
    expect(error).toBeNull();
    const [row] = await rows(gameId);
    expect(new Date(row!.created_at).getFullYear()).toBeGreaterThanOrEqual(
      2026,
    );
  });

  it("the owner can edit the text and topics, and the date written stays", async () => {
    const { gameId } = await newGame(a, "Edit Me");
    const id = await write(a, gameId, {
      body: "First",
      topics: ["theme"],
      writtenOn: "2024-03-03",
    });
    const before = (await rows(gameId))[0]!;
    await new Promise((resolve) => setTimeout(resolve, 20));

    const result = await updateThought(a.client, {
      thoughtId: id,
      body: "  Changed  ",
      topics: ["combat", "artwork"],
    });
    expect(result).toMatchObject({ ok: true, thoughtId: id });
    expect(result.ok && result.thought).toMatchObject({
      id,
      body: "Changed",
      topics: ["artwork", "combat"],
      writtenOn: "2024-03-03",
    });

    const after = (await rows(gameId))[0]!;
    expect(after).toMatchObject({
      body: "Changed",
      topics: ["artwork", "combat"],
      written_on: "2024-03-03",
      game_id: gameId,
      user_id: a.id,
    });
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime(),
    );
    expect(after.created_at).toBe(before.created_at);
  });

  it("editing refuses bad input, and only body and topics can change through the API", async () => {
    const { gameId } = await newGame(a, "Edit Limits");
    const id = await write(a, gameId, { body: "Keep" });

    const empty = await updateThought(a.client, { thoughtId: id, body: " " });
    expect(empty).toMatchObject({ ok: false, error: { code: "validation" } });
    const badTopic = await a.client
      .from("journal_entries")
      .update({ topics: ["humour"] })
      .eq("id", id);
    expect(badTopic.error).not.toBeNull();

    for (const change of [
      { written_on: "2000-01-01" },
      { game_id: randomUUID() },
      { user_id: b.id },
      { created_at: "2000-01-01T00:00:00Z" },
    ]) {
      const { error } = await a.client
        .from("journal_entries")
        .update(change)
        .eq("id", id);
      expect(error, JSON.stringify(change)).not.toBeNull();
    }
    const [row] = await rows(gameId);
    expect(row).toMatchObject({ body: "Keep", user_id: a.id });
  });

  it("another person cannot edit or delete my thought", async () => {
    const { gameId } = await newGame(a, "B Cannot Touch");
    const id = await write(a, gameId, { body: "Mine" });

    const edit = await updateThought(b.client, {
      thoughtId: id,
      body: "Hacked",
    });
    expect(edit).toMatchObject({ ok: false, error: { code: "not_found" } });
    const del = await deleteThought(b.client, { thoughtId: id });
    expect(del).toMatchObject({ ok: false, error: { code: "not_found" } });
    await b.client.from("journal_entries").update({ body: "x" }).eq("id", id);
    await b.client.from("journal_entries").delete().eq("id", id);

    const [row] = await rows(gameId);
    expect(row).toMatchObject({ id, body: "Mine" });
  });

  it("the owner can delete a thought for good", async () => {
    const { gameId } = await newGame(a, "Delete Me");
    const keep = await write(a, gameId, { body: "Keep" });
    const id = await write(a, gameId, { body: "Remove" });

    const result = await deleteThought(a.client, { thoughtId: id });
    expect(result).toEqual({ ok: true, data: { thoughtId: id } });
    const left = await rows(gameId);
    expect(left.map((row) => row.id)).toEqual([keep]);

    const again = await deleteThought(a.client, { thoughtId: id });
    expect(again).toMatchObject({ ok: false, error: { code: "not_found" } });
    const bad = await deleteThought(a.client, { thoughtId: "nope" });
    expect(bad).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("the body limit cannot be bypassed with whitespace on a direct update or insert", async () => {
    const { gameId } = await newGame(a, "Body Limit");
    const id = await write(a, gameId, { body: "Keep" });

    for (const body of [
      "x" + " ".repeat(1_000_000),
      "x".repeat(10_001),
      " ".repeat(20),
      "\t\n \t",
      "",
    ]) {
      const update = await a.client
        .from("journal_entries")
        .update({ body })
        .eq("id", id);
      expect(update.error, `update ${body.length}`).not.toBeNull();
      const insert = await a.client
        .from("journal_entries")
        .insert({ game_id: gameId, body });
      expect(insert.error, `insert ${body.length}`).not.toBeNull();
    }
    // Exactly at the limit is fine.
    const ok = await a.client
      .from("journal_entries")
      .update({ body: "y".repeat(10_000) })
      .eq("id", id);
    expect(ok.error).toBeNull();
  });

  it("a direct update cannot store duplicate or wrongly cased topics", async () => {
    const { gameId } = await newGame(a, "Topic Update");
    const id = await write(a, gameId, { topics: ["theme"] });
    for (const topics of [
      ["theme", "theme"],
      ["Theme"],
      ["solo mode"],
      ["nope"],
    ]) {
      const { error } = await a.client
        .from("journal_entries")
        .update({ topics })
        .eq("id", id);
      expect(error, JSON.stringify(topics)).not.toBeNull();
    }
    const ok = await a.client
      .from("journal_entries")
      .update({ topics: ["solo_mode", "combat"] })
      .eq("id", id);
    expect(ok.error).toBeNull();
  });

  it("another person's direct update and delete touch no rows", async () => {
    const { gameId } = await newGame(a, "B Direct");
    const id = await write(a, gameId, { body: "Mine" });
    const update = await b.client
      .from("journal_entries")
      .update({ body: "Hacked" })
      .eq("id", id)
      .select("id");
    expect(update.data ?? []).toEqual([]);
    const del = await b.client
      .from("journal_entries")
      .delete()
      .eq("id", id)
      .select("id");
    expect(del.data ?? []).toEqual([]);
    const [row] = await rows(gameId);
    expect(row).toMatchObject({ id, body: "Mine" });
  });

  it("is closed to anonymous visitors", async () => {
    const { gameId } = await newGame(a, "Anon Target");
    const anon = anonymousClient();
    const call = await anon.rpc("add_thought", {
      p_game_id: gameId,
      p_body: "x",
    });
    expect(call.error).not.toBeNull();
    const read = await anon.from("journal_entries").select("*").limit(1);
    expect(read.error).not.toBeNull();
  });

  it("deleting the last copy keeps a game that has thoughts, and the thoughts", async () => {
    const { entryId, gameId } = await newGame(a, "Written And Removed");
    const id = await write(a, gameId);

    await archiveEntry(a.client, { entryId });
    const result = await deleteEntry(a.client, { entryId });
    expect(result).toEqual({ ok: true, data: { gameDeleted: false } });

    const game = await admin
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    expect(game.data).not.toBeNull();
    const list = await listThoughts(a.client, a.id, gameId);
    expect(list.ok && list.data.map((item) => item.id)).toEqual([id]);
  });

  it("a game cannot be deleted directly while it has thoughts", async () => {
    const { entryId, gameId } = await newGame(a, "Direct Game Delete");
    await write(a, gameId);
    // Without the copy, only the thought can stop the delete.
    await admin.from("collection_entries").delete().eq("id", entryId);
    const { error } = await a.client.from("games").delete().eq("id", gameId);
    expect(error).not.toBeNull();
    const game = await admin
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    expect(game.data).not.toBeNull();
  });

  it("deleting an account still removes its thoughts and games", async () => {
    const c = await createTestUser("thought-c");
    const { gameId } = await newGame(c, "Goes With Account");
    await write(c, gameId);

    const { error } = await admin.auth.admin.deleteUser(c.id);
    expect(error).toBeNull();
    expect(await rows(gameId)).toHaveLength(0);
    const game = await admin
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    expect(game.data).toBeNull();
  });

  it("a thought on a public game does not block deleting the account", async () => {
    const d = await createTestUser("thought-d");
    const gameId = await insertPublicGame("Public For D");
    await write(d, gameId);

    const { error } = await admin.auth.admin.deleteUser(d.id);
    expect(error).toBeNull();
    expect(await rows(gameId)).toHaveLength(0);
    const game = await admin
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    expect(game.data).not.toBeNull();
  });
});
