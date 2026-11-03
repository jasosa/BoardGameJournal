import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addManualGame, listLibrary } from "@/server/services/collection";
import {
  admin,
  anonymousClient,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

describe("collection service (add_manual_game + listLibrary)", () => {
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    a = await createTestUser("svc-a");
    b = await createTestUser("svc-b");
  });
  afterAll(deleteTestUsers);

  it("creates a private manual game and an entry for the caller", async () => {
    const result = await addManualGame(a.client, {
      title: "  Wingspan ",
      status: "owned",
    });
    expect(result.ok).toBe(true);

    const entry = await admin
      .from("collection_entries")
      .select("user_id, status, games(name, source, visibility, created_by)")
      .eq("user_id", a.id)
      .single();
    expect(entry.data?.status).toBe("owned");
    expect(entry.data?.games).toMatchObject({
      name: "Wingspan",
      source: "manual",
      visibility: "private",
      created_by: a.id,
    });
  });

  it("lists the caller's entries newest first, with status", async () => {
    await addManualGame(a.client, { title: "Cascadia", status: "wishlist" });
    const result = await listLibrary(a.client, a.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((i) => [i.title, i.status])).toEqual([
      ["Cascadia", "wishlist"],
      ["Wingspan", "owned"],
    ]);
  });

  it("does not show A's games to B", async () => {
    const result = await listLibrary(b.client, b.id);
    expect(result).toEqual({ ok: true, data: [] });
  });

  it("rejects invalid input before touching the database", async () => {
    const before = await admin
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("created_by", a.id);
    for (const input of [
      { title: "   ", status: "owned" },
      { title: "X", status: "stolen" },
      { title: "x".repeat(201), status: "owned" },
      null,
    ]) {
      const result = await addManualGame(a.client, input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("validation");
    }
    const after = await admin
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("created_by", a.id);
    expect(after.count).toBe(before.count);
  });

  it("creates neither row when the database rejects the call", async () => {
    // Bypass the Zod layer: call the function directly with a bad status.
    const before = await admin
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("created_by", a.id);
    const { error } = await a.client.rpc("add_manual_game", {
      p_title: "Orphan check",
      p_status: "stolen",
    });
    expect(error).not.toBeNull();
    const after = await admin
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("created_by", a.id);
    expect(after.count).toBe(before.count);
  });

  it("does not let anonymous visitors call the function", async () => {
    const { error } = await anonymousClient().rpc("add_manual_game", {
      p_title: "Anon",
      p_status: "owned",
    });
    expect(error?.code).toBe("42501");
  });
});
