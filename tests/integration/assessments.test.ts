import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  archiveEntry,
  addManualGame,
  deleteEntry,
} from "@/server/services/collection";
import { addAssessment, listAssessments } from "@/server/services/assessments";
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

describe("assessments", () => {
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

  const rate = async (user: TestUser, gameId: string, extra = {}) => {
    const result = await addAssessment(user.client, {
      gameId,
      overall: "8",
      ...extra,
    });
    if (!result.ok) throw new Error(`rating failed: ${result.error.message}`);
    return result.assessmentId;
  };

  const rows = async (gameId: string) =>
    (await admin.from("assessments").select("*").eq("game_id", gameId)).data ??
    [];

  beforeAll(async () => {
    a = await createTestUser("rate-a");
    b = await createTestUser("rate-b");
  });
  afterAll(deleteTestUsers);

  it("adds a rating and lists it", async () => {
    const { gameId } = await newGame(a, "Wingspan");
    const id = await rate(a, gameId, { overall: "8,5" });

    const list = await listAssessments(a.client, a.id, gameId);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({ id, gameId, overall: 8.5 });
    expect(list.data[0]!.assessedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("a new rating never changes an old one, and the latest is current", async () => {
    const { gameId } = await newGame(a, "Azul");
    const first = await rate(a, gameId, {
      overall: "6",
      assessedOn: "2024-01-10",
    });
    const before = (await rows(gameId)).find((row) => row.id === first);

    const second = await rate(a, gameId, {
      overall: "9",
      assessedOn: "2024-06-01",
    });
    const afterRows = await rows(gameId);
    expect(afterRows).toHaveLength(2);
    expect(afterRows.find((row) => row.id === first)).toEqual(before);

    const list = await listAssessments(a.client, a.id, gameId);
    expect(list.ok && list.data.map((item) => item.id)).toEqual([
      second,
      first,
    ]);

    const current = await a.client
      .from("current_ratings")
      .select("assessment_id, overall")
      .eq("game_id", gameId);
    expect(current.data).toEqual([{ assessment_id: second, overall: 9 }]);
  });

  it("a rating dated earlier than the newest does not become current", async () => {
    const { gameId } = await newGame(a, "Heat");
    await rate(a, gameId, { overall: "7", assessedOn: "2024-06-01" });
    await rate(a, gameId, { overall: "3", assessedOn: "2023-01-01" });
    const current = await a.client
      .from("current_ratings")
      .select("overall")
      .eq("game_id", gameId);
    expect(current.data).toEqual([{ overall: 7 }]);
  });

  it("another person cannot read ratings", async () => {
    const { gameId } = await newGame(a, "Private Game");
    const id = await rate(a, gameId);

    const list = await listAssessments(b.client, b.id, gameId);
    expect(list.ok && list.data).toEqual([]);
    const direct = await b.client.from("assessments").select("id").eq("id", id);
    expect(direct.data).toEqual([]);
    const current = await b.client
      .from("current_ratings")
      .select("assessment_id")
      .eq("game_id", gameId);
    expect(current.data).toEqual([]);
  });

  it("cannot rate a game that is not visible, or does not exist", async () => {
    const { gameId } = await newGame(a, "Hidden From B");
    const hidden = await addAssessment(b.client, { gameId, overall: "8" });
    expect(hidden).toMatchObject({ ok: false, error: { code: "not_found" } });
    const missing = await addAssessment(b.client, {
      gameId: randomUUID(),
      overall: "8",
    });
    expect(missing).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(await rows(gameId)).toHaveLength(0);
  });

  it("can rate a public game without owning it", async () => {
    const gameId = await insertPublicGame("Catalogue Game");
    const id = await rate(b, gameId, { overall: "7" });
    expect(id).toBeTruthy();
  });

  it("cannot insert as someone else", async () => {
    const { gameId } = await newGame(a, "Spoof Target");
    const spoof = await b.client
      .from("assessments")
      .insert({ user_id: a.id, game_id: gameId, overall: 5 });
    expect(spoof.error).not.toBeNull();
    expect(await rows(gameId)).toHaveLength(0);
  });

  it("nobody can update or delete a rating through the API", async () => {
    const { gameId } = await newGame(a, "Append Only");
    const id = await rate(a, gameId, { overall: "6" });

    for (const client of [a.client, b.client]) {
      await client.from("assessments").update({ overall: 10 }).eq("id", id);
      await client.from("assessments").delete().eq("id", id);
    }
    const own = await a.client
      .from("assessments")
      .update({ overall: 10 })
      .eq("id", id);
    expect(own.error).not.toBeNull();
    const ownDelete = await a.client.from("assessments").delete().eq("id", id);
    expect(ownDelete.error).not.toBeNull();

    const still = await admin
      .from("assessments")
      .select("overall")
      .eq("id", id)
      .single();
    expect(still.data?.overall).toBe(6);
  });

  it("is closed to anonymous visitors", async () => {
    const { gameId } = await newGame(a, "Anon Target");
    const anon = anonymousClient();
    const call = await anon.rpc("add_assessment", {
      p_game_id: gameId,
      p_overall: 5,
    });
    expect(call.error).not.toBeNull();
    for (const table of ["assessments", "current_ratings"]) {
      const read = await anon.from(table).select("*").limit(1);
      expect(read.error).not.toBeNull();
    }
  });

  it("refuses odd values and dates, in the database and in the service", async () => {
    const { gameId } = await newGame(a, "Bad Values");
    for (const overall of [-1, 10.5, 11, 9.96, 10.04, 99.96, -0.04]) {
      const { error } = await a.client.rpc("add_assessment", {
        p_game_id: gameId,
        p_overall: overall,
      });
      expect(error, String(overall)).not.toBeNull();
    }
    const future = await a.client.rpc("add_assessment", {
      p_game_id: gameId,
      p_overall: 5,
      p_assessed_on: daysFromNow(3),
    });
    expect(future.error?.message).toContain("invalid_date");
    expect(await rows(gameId)).toHaveLength(0);

    const service = await addAssessment(a.client, { gameId, overall: "ten" });
    expect(service).toMatchObject({
      ok: false,
      error: {
        code: "validation",
        fieldErrors: { overall: expect.any(String) },
      },
    });
    const futureService = await addAssessment(a.client, {
      gameId,
      overall: "5",
      assessedOn: "2999-01-01",
    });
    expect(futureService).toMatchObject({
      ok: false,
      error: { code: "validation" },
    });
  });

  it("a direct insert cannot use a far date, an old date, or choose created_at", async () => {
    const { gameId } = await newGame(a, "Direct Insert");
    for (const assessed_on of ["9999-12-31", "1800-01-01", daysFromNow(5)]) {
      const { error } = await a.client
        .from("assessments")
        .insert({ game_id: gameId, overall: 5, assessed_on });
      expect(error).not.toBeNull();
    }
    expect(await rows(gameId)).toHaveLength(0);

    const { error } = await a.client.from("assessments").insert({
      game_id: gameId,
      overall: 5,
      created_at: "2000-01-01T00:00:00Z",
    });
    expect(error).toBeNull();
    const [row] = await rows(gameId);
    expect(new Date(row!.created_at).getFullYear()).toBeGreaterThanOrEqual(
      2026,
    );
  });

  it("deleting the last copy keeps a game that has ratings, and the ratings", async () => {
    const { entryId, gameId } = await newGame(a, "Rated And Removed");
    const id = await rate(a, gameId);

    await archiveEntry(a.client, { entryId });
    const result = await deleteEntry(a.client, { entryId });
    expect(result).toEqual({ ok: true, data: { gameDeleted: false } });

    const game = await admin
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    expect(game.data).not.toBeNull();
    const list = await listAssessments(a.client, a.id, gameId);
    expect(list.ok && list.data.map((item) => item.id)).toEqual([id]);
  });

  it("a game cannot be deleted directly while it has ratings", async () => {
    const { entryId, gameId } = await newGame(a, "Direct Game Delete");
    await rate(a, gameId);
    // Without the copy, only the rating can stop the delete.
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

  it("deleting an account still removes its ratings and games", async () => {
    const c = await createTestUser("rate-c");
    const { gameId } = await newGame(c, "Goes With Account");
    await rate(c, gameId);

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

  it("a rating on a public game does not block deleting the account", async () => {
    const d = await createTestUser("rate-d");
    const gameId = await insertPublicGame("Public For D");
    await rate(d, gameId);

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
