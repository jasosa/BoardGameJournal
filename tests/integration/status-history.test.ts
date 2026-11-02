import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addManualGame, changeEntryStatus } from "@/server/services/collection";
import { getGameDossier } from "@/server/services/games";
import {
  admin,
  anonymousClient,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe("collection status history", () => {
  let a: TestUser;
  let b: TestUser;
  let gameId: string;
  let entryId: string;

  async function newEntry(user: TestUser, title: string, status = "owned") {
    const added = await addManualGame(user.client, { title, status });
    if (!added.ok) throw new Error("setup failed");
    const row = await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", added.data.entryId)
      .single();
    return { entryId: added.data.entryId, gameId: row.data!.game_id as string };
  }

  const history = async (entry: string, client = a.client) =>
    (
      await client
        .from("collection_status_changes")
        .select("from_status, to_status, changed_on, recorded_at")
        .eq("entry_id", entry)
        .order("recorded_at", { ascending: true })
    ).data ?? [];

  beforeAll(async () => {
    a = await createTestUser("hist-a");
    b = await createTestUser("hist-b");
    ({ entryId, gameId } = await newEntry(a, "Wingspan"));
  });
  afterAll(deleteTestUsers);

  it("records the first status when a game is added", async () => {
    const rows = await history(entryId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ from_status: null, to_status: "owned" });
    // Today in UTC, give or take the day the database and this machine may disagree on.
    expect([daysFromNow(-1), daysFromNow(0), daysFromNow(1)]).toContain(
      rows[0]!.changed_on,
    );
  });

  it("records a change with its from and to status, and when it was logged", async () => {
    const before = Date.now();
    const result = await changeEntryStatus(a.client, {
      entryId,
      status: "wishlist",
    });
    expect(result).toEqual({ ok: true, data: { entryId, status: "wishlist" } });
    const rows = await history(entryId);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      from_status: "owned",
      to_status: "wishlist",
    });
    expect(
      Math.abs(new Date(rows[1]!.recorded_at).getTime() - before),
    ).toBeLessThan(60_000);
    const entry = await admin
      .from("collection_entries")
      .select("status")
      .eq("id", entryId)
      .single();
    expect(entry.data?.status).toBe("wishlist");
  });

  it("writes nothing when the status does not change", async () => {
    const result = await changeEntryStatus(a.client, {
      entryId,
      status: "wishlist",
    });
    expect(result.ok).toBe(true);
    expect(await history(entryId)).toHaveLength(2);
  });

  it("keeps the date the person chose", async () => {
    const result = await changeEntryStatus(a.client, {
      entryId,
      status: "previously_owned",
      changedOn: "2019-06-01",
    });
    expect(result.ok).toBe(true);
    const rows = await history(entryId);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({
      from_status: "wishlist",
      to_status: "previously_owned",
      changed_on: "2019-06-01",
    });
  });

  it("refuses a future date or a date before 1900, in the database too, and changes nothing", async () => {
    for (const date of [daysFromNow(3), "1899-12-31"]) {
      const { error } = await a.client.rpc("change_entry_status", {
        p_entry_id: entryId,
        p_status: "owned",
        p_changed_on: date,
      });
      expect(error?.message, date).toContain("invalid_date");
    }
    const noDate = await a.client.rpc("change_entry_status", {
      p_entry_id: entryId,
      p_status: "owned",
      p_changed_on: null as unknown as string,
    });
    expect(noDate.error?.message).toContain("invalid_date");

    const service = await changeEntryStatus(a.client, {
      entryId,
      status: "owned",
      changedOn: daysFromNow(3),
    });
    expect(service).toMatchObject({ ok: false, error: { code: "validation" } });

    expect(await history(entryId)).toHaveLength(3);
    const entry = await admin
      .from("collection_entries")
      .select("status")
      .eq("id", entryId)
      .single();
    expect(entry.data?.status).toBe("previously_owned");
  });

  it("refuses an unknown status and changes nothing", async () => {
    const { error } = await a.client.rpc("change_entry_status", {
      p_entry_id: entryId,
      p_status: "stolen",
    });
    expect(error).not.toBeNull();
    expect(await history(entryId)).toHaveLength(3);
  });

  it("does not let B change A's copy or read A's history", async () => {
    const service = await changeEntryStatus(b.client, {
      entryId,
      status: "owned",
    });
    expect(service).toMatchObject({ ok: false, error: { code: "not_found" } });
    const direct = await b.client.rpc("change_entry_status", {
      p_entry_id: entryId,
      p_status: "owned",
    });
    expect(direct.error).toBeNull();
    expect(direct.data).toBeNull();

    expect(await history(entryId)).toHaveLength(3);
    expect(await history(entryId, b.client)).toEqual([]);
    const all = await b.client.from("collection_status_changes").select("id");
    expect(all.data).toEqual([]);
  });

  it("gives anonymous visitors nothing", async () => {
    const anon = anonymousClient();
    const call = await anon.rpc("change_entry_status", {
      p_entry_id: entryId,
      p_status: "owned",
    });
    expect(call.error?.code).toBe("42501");
    const read = await anon.from("collection_status_changes").select("id");
    expect(read.error?.code).toBe("42501");
  });

  it("cannot be written, edited or deleted through the API", async () => {
    const insert = await a.client.from("collection_status_changes").insert({
      user_id: a.id,
      entry_id: entryId,
      from_status: "owned",
      to_status: "wishlist",
      changed_on: "2020-01-01",
    });
    expect(insert.error).not.toBeNull();
    const update = await a.client
      .from("collection_status_changes")
      .update({ changed_on: "2000-01-01" })
      .eq("entry_id", entryId);
    expect(update.error).not.toBeNull();
    const remove = await a.client
      .from("collection_status_changes")
      .delete()
      .eq("entry_id", entryId);
    expect(remove.error).not.toBeNull();
    expect(await history(entryId)).toHaveLength(3);
  });

  it("closes direct status updates but keeps the other fields editable", async () => {
    const status = await a.client
      .from("collection_entries")
      .update({ status: "owned" })
      .eq("id", entryId);
    expect(status.error).not.toBeNull();
    const notes = await a.client
      .from("collection_entries")
      .update({ notes: "Bought in a sale" })
      .eq("id", entryId)
      .select("notes");
    expect(notes.error).toBeNull();
    expect(notes.data).toEqual([{ notes: "Bought in a sale" }]);
    const entry = await admin
      .from("collection_entries")
      .select("status")
      .eq("id", entryId)
      .single();
    expect(entry.data?.status).toBe("previously_owned");
    expect(await history(entryId)).toHaveLength(3);
  });

  it("records two quick changes one after the other", async () => {
    const copy = await newEntry(a, "Cascadia");
    const [x, y] = await Promise.all([
      changeEntryStatus(a.client, {
        entryId: copy.entryId,
        status: "wishlist",
      }),
      changeEntryStatus(a.client, {
        entryId: copy.entryId,
        status: "interested",
      }),
    ]);
    expect(x.ok && y.ok).toBe(true);
    const rows = await history(copy.entryId);
    expect(rows).toHaveLength(3);
    // The chain is unbroken: each row starts where the last one ended.
    expect(rows[1]!.from_status).toBe(rows[0]!.to_status);
    expect(rows[2]!.from_status).toBe(rows[1]!.to_status);
    const entry = await admin
      .from("collection_entries")
      .select("status")
      .eq("id", copy.entryId)
      .single();
    expect(entry.data?.status).toBe(rows[2]!.to_status);
  });

  it("removes a copy's history only when the copy itself is deleted", async () => {
    const copy = await newEntry(a, "Heat");
    await changeEntryStatus(a.client, {
      entryId: copy.entryId,
      status: "wishlist",
    });
    expect(await history(copy.entryId)).toHaveLength(2);
    await admin.from("collection_entries").delete().eq("id", copy.entryId);
    const left = await admin
      .from("collection_status_changes")
      .select("id")
      .eq("entry_id", copy.entryId);
    expect(left.data).toEqual([]);
  });

  it("gives the game page its history, latest logged first, so the top row is the current status", async () => {
    const dossier = await getGameDossier(a.client, a.id, gameId);
    expect(dossier.ok).toBe(true);
    if (!dossier.ok) return;
    // Logged in this order: added, to wishlist, to previously owned (dated 2019).
    expect(
      dossier.data.history.map((c) => [
        c.from,
        c.to,
        c.changedOn.slice(0, 4) === "2019",
      ]),
    ).toEqual([
      ["wishlist", "previously_owned", true],
      ["owned", "wishlist", false],
      [null, "owned", false],
    ]);
    const current = await admin
      .from("collection_entries")
      .select("status")
      .eq("id", entryId)
      .single();
    expect(dossier.data.history[0]!.to).toBe(current.data?.status);
    for (const change of dossier.data.history) {
      expect(change.entryId).toBe(entryId);
    }

    const other = await getGameDossier(b.client, b.id, gameId);
    expect(other).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("dates the first row with the date the person gives, and refuses bad dates", async () => {
    const added = await addManualGame(a.client, {
      title: "Dated add",
      status: "wishlist",
      addedOn: "2024-05-05",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const rows = await history(added.data.entryId);
    expect(rows[0]).toMatchObject({
      from_status: null,
      to_status: "wishlist",
      changed_on: "2024-05-05",
    });

    // The date is used once: the next game in a new call is dated today again.
    const next = await addManualGame(a.client, {
      title: "Undated add",
      status: "owned",
    });
    if (!next.ok) throw new Error("setup failed");
    const nextRows = await history(next.data.entryId);
    expect([daysFromNow(-1), daysFromNow(0), daysFromNow(1)]).toContain(
      nextRows[0]!.changed_on,
    );

    const gamesBefore = await admin
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("created_by", a.id);
    const future = await addManualGame(a.client, {
      title: "Future add",
      status: "owned",
      addedOn: daysFromNow(4),
    });
    expect(future).toMatchObject({ ok: false, error: { code: "validation" } });
    const direct = await a.client.rpc("add_manual_game", {
      p_title: "Direct bad date",
      p_status: "owned",
      p_added_on: "1899-01-01",
    });
    expect(direct.error?.message).toContain("invalid_date");
    const gamesAfter = await admin
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("created_by", a.id);
    expect(gamesAfter.count).toBe(gamesBefore.count);
  });

  it("writes a first row for an entry inserted directly, not through add_manual_game", async () => {
    const game = await a.client
      .from("games")
      .insert({ name: "Direct insert", source: "manual" })
      .select("id")
      .single();
    const entry = await a.client
      .from("collection_entries")
      .insert({ game_id: game.data!.id, status: "interested" })
      .select("id")
      .single();
    expect(entry.error).toBeNull();
    const rows = await history(entry.data!.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      from_status: null,
      to_status: "interested",
    });
  });

  it("does not let the owner delete a copy through the API, so history cannot be wiped", async () => {
    const copy = await newEntry(a, "Keep my history");
    const remove = await a.client
      .from("collection_entries")
      .delete()
      .eq("id", copy.entryId);
    expect(remove.error).not.toBeNull();
    const still = await admin
      .from("collection_entries")
      .select("id")
      .eq("id", copy.entryId);
    expect(still.data).toHaveLength(1);
    expect(await history(copy.entryId)).toHaveLength(1);
  });

  it("does not let the owner move an entry to another game or user", async () => {
    const userId = await a.client
      .from("collection_entries")
      .update({ user_id: b.id })
      .eq("id", entryId);
    expect(userId.error).not.toBeNull();
    const game = await a.client
      .from("collection_entries")
      .update({ game_id: gameId })
      .eq("id", entryId);
    expect(game.error).not.toBeNull();
  });

  it("refuses a status change that skips the function, even from the service role", async () => {
    const before = await history(entryId);
    const direct = await admin
      .from("collection_entries")
      .update({ status: "interested" })
      .eq("id", entryId);
    expect(direct.error?.message).toContain("status_change_via_function_only");
    const entry = await admin
      .from("collection_entries")
      .select("status")
      .eq("id", entryId)
      .single();
    expect(entry.data?.status).toBe("previously_owned");
    expect(await history(entryId)).toHaveLength(before.length);
    // Other columns stay editable for the service role too.
    const notes = await admin
      .from("collection_entries")
      .update({ notes: "admin note" })
      .eq("id", entryId);
    expect(notes.error).toBeNull();
    // The function still works after a refused attempt (the guard flag does not stick).
    const ok = await changeEntryStatus(a.client, { entryId, status: "owned" });
    expect(ok.ok).toBe(true);
    await changeEntryStatus(a.client, { entryId, status: "previously_owned" });
  });
});
