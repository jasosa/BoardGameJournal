import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addGameCopy,
  addManualGame,
  archiveEntry,
  deleteEntry,
  findTitleMatches,
  listLibrary,
  restoreEntry,
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

describe("archive, restore and permanent delete", () => {
  let a: TestUser;
  let b: TestUser;

  async function newEntry(user: TestUser, title: string) {
    const added = await addManualGame(user.client, { title, status: "owned" });
    if (!added.ok) throw new Error("setup failed");
    const row = await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", added.data.entryId)
      .single();
    return { entryId: added.data.entryId, gameId: row.data!.game_id as string };
  }

  const entryRow = async (entryId: string) =>
    (
      await admin
        .from("collection_entries")
        .select("id, archived_at")
        .eq("id", entryId)
        .maybeSingle()
    ).data;
  const historyCount = async (entryId: string) =>
    (
      await admin
        .from("collection_status_changes")
        .select("id", { count: "exact", head: true })
        .eq("entry_id", entryId)
    ).count;
  const gameExists = async (gameId: string) =>
    (await admin.from("games").select("id").eq("id", gameId).maybeSingle())
      .data !== null;

  beforeAll(async () => {
    a = await createTestUser("arch-a");
    b = await createTestUser("arch-b");
  });
  afterAll(deleteTestUsers);

  it("archives and restores a copy, keeping its history", async () => {
    const { entryId } = await newEntry(a, "Wingspan");

    expect(await archiveEntry(a.client, { entryId })).toEqual({
      ok: true,
      data: { entryId },
    });
    expect((await entryRow(entryId))?.archived_at).not.toBeNull();
    expect(await historyCount(entryId)).toBe(1);

    // Archiving twice keeps the first date.
    const first = (await entryRow(entryId))?.archived_at;
    await archiveEntry(a.client, { entryId });
    expect((await entryRow(entryId))?.archived_at).toBe(first);

    expect(await restoreEntry(a.client, { entryId })).toEqual({
      ok: true,
      data: { entryId },
    });
    expect((await entryRow(entryId))?.archived_at).toBeNull();
    expect(await historyCount(entryId)).toBe(1);
  });

  it("marks archived copies in the library list and the game page", async () => {
    const { entryId, gameId } = await newEntry(a, "Azul");
    await archiveEntry(a.client, { entryId });

    const library = await listLibrary(a.client, a.id);
    expect(
      library.ok && library.data.find((i) => i.entryId === entryId),
    ).toMatchObject({ archived: true });

    const dossier = await getGameDossier(a.client, a.id, gameId);
    expect(dossier.ok && dossier.data.entries[0]).toMatchObject({
      archived: true,
    });
  });

  it("another person cannot archive, restore or delete my copy", async () => {
    const { entryId } = await newEntry(a, "Private Game");

    const archived = await archiveEntry(b.client, { entryId });
    expect(archived).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect((await entryRow(entryId))?.archived_at).toBeNull();

    await archiveEntry(a.client, { entryId });
    const restored = await restoreEntry(b.client, { entryId });
    expect(restored).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect((await entryRow(entryId))?.archived_at).not.toBeNull();

    const deleted = await deleteEntry(b.client, { entryId });
    expect(deleted).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(await entryRow(entryId)).not.toBeNull();
  });

  it("anonymous visitors cannot call the functions", async () => {
    const { entryId } = await newEntry(a, "Anon Target");
    const anon = anonymousClient();
    for (const fn of ["archive_entry", "restore_entry", "delete_entry"]) {
      const { error } = await anon.rpc(fn, { p_entry_id: entryId });
      expect(error).not.toBeNull();
    }
    expect((await entryRow(entryId))?.archived_at).toBeNull();
  });

  it("refuses permanent delete until the copy is archived", async () => {
    const { entryId, gameId } = await newEntry(a, "Not Yet");
    const result = await deleteEntry(a.client, { entryId });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "not_archived" },
    });
    expect(await entryRow(entryId)).not.toBeNull();
    expect(await gameExists(gameId)).toBe(true);
  });

  it("owners still cannot delete an entry directly through the API", async () => {
    const { entryId } = await newEntry(a, "Direct Delete");
    await archiveEntry(a.client, { entryId });
    const { error } = await a.client
      .from("collection_entries")
      .delete()
      .eq("id", entryId);
    expect(error).not.toBeNull();
    expect(await entryRow(entryId)).not.toBeNull();
  });

  it("owners cannot write archived_at on someone else's copy directly", async () => {
    const { entryId } = await newEntry(a, "Direct Update");
    await b.client
      .from("collection_entries")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", entryId);
    expect((await entryRow(entryId))?.archived_at).toBeNull();
  });

  it("deletes an archived copy with its history and the manual game with it", async () => {
    const { entryId, gameId } = await newEntry(a, "Gone For Good");
    await archiveEntry(a.client, { entryId });

    const result = await deleteEntry(a.client, { entryId });
    expect(result).toEqual({ ok: true, data: { gameDeleted: true } });
    expect(await entryRow(entryId)).toBeNull();
    expect(await historyCount(entryId)).toBe(0);
    expect(await gameExists(gameId)).toBe(false);
  });

  it("removes the cover files when the game goes", async () => {
    const { entryId, gameId } = await newEntry(a, "With Cover");
    const imageId = randomUUID();
    const dir = `${a.id}/${gameId}/${imageId}`;
    for (const name of ["cover.webp", "thumb.webp"]) {
      const { error } = await admin.storage
        .from("covers")
        .upload(`${dir}/${name}`, new Uint8Array([1, 2, 3]), {
          contentType: "image/webp",
        });
      expect(error).toBeNull();
    }
    const { error: imageError } = await admin.from("game_images").insert({
      id: imageId,
      game_id: gameId,
      kind: "cover",
      storage_path: `${dir}/cover.webp`,
      width: 900,
      height: 1200,
    });
    expect(imageError).toBeNull();

    await archiveEntry(a.client, { entryId });
    const result = await deleteEntry(a.client, { entryId });
    expect(result).toEqual({ ok: true, data: { gameDeleted: true } });

    const left = await admin.storage.from("covers").list(dir);
    expect(left.data ?? []).toHaveLength(0);
    const rows = await admin.from("game_images").select("id").eq("id", imageId);
    expect(rows.data).toHaveLength(0);
  });

  it("keeps the game while another copy exists", async () => {
    const { entryId, gameId } = await newEntry(a, "Two Copies");
    const second = await addGameCopy(a.client, { gameId, status: "wishlist" });
    if (!second.ok) throw new Error("setup failed");

    await archiveEntry(a.client, { entryId });
    const result = await deleteEntry(a.client, { entryId });
    expect(result).toEqual({ ok: true, data: { gameDeleted: false } });
    expect(await entryRow(entryId)).toBeNull();
    expect(await entryRow(second.data.entryId)).not.toBeNull();
    expect(await historyCount(second.data.entryId)).toBe(1);
    expect(await gameExists(gameId)).toBe(true);
  });

  it("keeps the cover files and row while another copy keeps the game", async () => {
    const { entryId, gameId } = await newEntry(a, "Cover Stays");
    const imageId = randomUUID();
    const dir = `${a.id}/${gameId}/${imageId}`;
    for (const name of ["cover.webp", "thumb.webp"]) {
      await admin.storage
        .from("covers")
        .upload(`${dir}/${name}`, new Uint8Array([1]), {
          contentType: "image/webp",
        });
    }
    await admin.from("game_images").insert({
      id: imageId,
      game_id: gameId,
      kind: "cover",
      storage_path: `${dir}/cover.webp`,
      width: 900,
      height: 1200,
    });
    const second = await addGameCopy(a.client, { gameId, status: "owned" });
    if (!second.ok) throw new Error("setup failed");

    await archiveEntry(a.client, { entryId });
    const result = await deleteEntry(a.client, { entryId });
    expect(result).toEqual({ ok: true, data: { gameDeleted: false } });

    const files = await admin.storage.from("covers").list(dir);
    expect(files.data ?? []).toHaveLength(2);
    const rows = await admin.from("game_images").select("id").eq("id", imageId);
    expect(rows.data).toHaveLength(1);
  });

  it("keeps a game that has an edition", async () => {
    const { entryId, gameId } = await newEntry(a, "Has Edition");
    const { error } = await admin
      .from("game_editions")
      .insert({ game_id: gameId, name: "Deluxe" });
    expect(error).toBeNull();

    await archiveEntry(a.client, { entryId });
    const result = await deleteEntry(a.client, { entryId });
    expect(result).toEqual({ ok: true, data: { gameDeleted: false } });
    expect(await gameExists(gameId)).toBe(true);
  });

  it("another person calling delete_entry directly gets not_found and deletes nothing", async () => {
    const { entryId } = await newEntry(a, "Direct Rpc");
    await archiveEntry(a.client, { entryId });
    const { data, error } = await b.client.rpc("delete_entry", {
      p_entry_id: entryId,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ result: "not_found" });
    expect(await entryRow(entryId)).not.toBeNull();
  });

  it("the owner can set archived_at directly, anonymous visitors cannot", async () => {
    const { entryId } = await newEntry(a, "Grant Check");
    const own = await a.client
      .from("collection_entries")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", entryId)
      .select("id");
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);

    await anonymousClient()
      .from("collection_entries")
      .update({ archived_at: null })
      .eq("id", entryId);
    expect((await entryRow(entryId))?.archived_at).not.toBeNull();
  });

  it("never deletes a public game", async () => {
    const gameId = await insertPublicGame("Public Catalogue Game");
    const copy = await addGameCopy(a.client, { gameId, status: "owned" });
    if (!copy.ok) throw new Error("setup failed");
    const entryId = copy.data.entryId;

    await archiveEntry(a.client, { entryId });
    const result = await deleteEntry(a.client, { entryId });
    expect(result).toEqual({ ok: true, data: { gameDeleted: false } });
    expect(await entryRow(entryId)).toBeNull();
    expect(await gameExists(gameId)).toBe(true);
  });

  it("does not touch another person's copies of the same public game", async () => {
    const gameId = await insertPublicGame("Shared Public Game");
    const mine = await addGameCopy(a.client, { gameId, status: "owned" });
    const theirs = await addGameCopy(b.client, { gameId, status: "owned" });
    if (!mine.ok || !theirs.ok) throw new Error("setup failed");

    await archiveEntry(a.client, { entryId: mine.data.entryId });
    await deleteEntry(a.client, { entryId: mine.data.entryId });
    expect(await entryRow(theirs.data.entryId)).not.toBeNull();
    expect(await historyCount(theirs.data.entryId)).toBe(1);
  });

  it("an archived game still shows up as a title match, marked archived", async () => {
    const { entryId } = await newEntry(a, "Brass Birmingham");
    await archiveEntry(a.client, { entryId });

    const matches = await findTitleMatches(a.client, a.id, "brass birmingham");
    expect(matches).toMatchObject({
      ok: true,
      data: [{ title: "Brass Birmingham", archived: true }],
    });

    await restoreEntry(a.client, { entryId });
    const again = await findTitleMatches(a.client, a.id, "Brass Birmingham");
    expect(again).toMatchObject({ ok: true, data: [{ archived: false }] });
  });

  it("rejects a bad id without calling the database", async () => {
    for (const fn of [archiveEntry, restoreEntry, deleteEntry]) {
      expect(await fn(a.client, { entryId: "nope" })).toMatchObject({
        ok: false,
        error: { code: "validation" },
      });
    }
  });
});
