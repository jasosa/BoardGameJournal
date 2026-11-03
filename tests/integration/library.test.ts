import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS,
  PAGE_SIZE,
  queryLibrary,
} from "@/features/collection/library-query";
import {
  addManualGame,
  findTitleMatches,
  listLibrary,
} from "@/server/services/collection";
import { uploadCover } from "@/server/services/covers";
import { seedLibrary } from "../support/seed";
import {
  admin,
  createTestUser,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

describe("Library with 250 games", () => {
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    a = await createTestUser("lib-a");
    b = await createTestUser("lib-b");
    await seedLibrary(a.id, 250);
    await addManualGame(b.client, { title: "Only B", status: "owned" });
  }, 60_000);
  afterAll(deleteTestUsers);

  it("lists all 250 copies with their facts, newest first", async () => {
    const result = await listLibrary(a.client, a.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(250);
    expect(result.data[0]).toMatchObject({
      title: "Wingspan",
      status: "owned",
      year: 2019,
      minPlayers: 1,
      maxPlayers: 5,
      playTimeMin: 40,
    });
    expect(result.data[4]).toMatchObject({
      title: "Catan",
      minPlayers: null,
      playTimeMin: null,
    });
  });

  it("never lists another person's games", async () => {
    const mine = await listLibrary(a.client, a.id);
    expect(mine.ok && mine.data.some((i) => i.title === "Only B")).toBe(false);
    const theirs = await listLibrary(b.client, b.id);
    expect(theirs.ok && theirs.data.map((i) => i.title)).toEqual(["Only B"]);
    // Asking for someone else's id returns nothing, even with a valid session.
    const crossed = await listLibrary(a.client, b.id);
    expect(crossed.ok && crossed.data).toEqual([]);
  });

  it("is not cut off at the API row limit", async () => {
    const big = await createTestUser("lib-big");
    await seedLibrary(big.id, 1005);
    const result = await listLibrary(big.client, big.id);
    expect(result.ok && result.data).toHaveLength(1005);
    expect(result.ok && new Set(result.data.map((i) => i.entryId)).size).toBe(
      1005,
    );
    const matches = await findTitleMatches(big.client, big.id, "Filler 1000");
    expect(matches.ok && matches.data.map((m) => m.title)).toEqual([
      "Filler 1000",
    ]);
  }, 120_000);

  it("pages, searches and filters the real rows", async () => {
    const result = await listLibrary(a.client, a.id);
    if (!result.ok) throw new Error("setup failed");
    const all = result.data;

    const first = queryLibrary(all, DEFAULT_PARAMS);
    expect(first.total).toBe(250);
    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(first.pageCount).toBe(Math.ceil(250 / PAGE_SIZE));

    const last = queryLibrary(all, { ...DEFAULT_PARAMS, page: 99 });
    expect(last.items).toHaveLength(250 - PAGE_SIZE * (last.pageCount - 1));

    const found = queryLibrary(all, { ...DEFAULT_PARAMS, q: "cafe" });
    expect(found.items.map((i) => i.title)).toEqual(["Café Terrace"]);

    const solo = queryLibrary(all, {
      ...DEFAULT_PARAMS,
      players: 1,
      time: 60,
    });
    expect(solo.items.map((i) => i.title).sort()).toEqual([
      "Wingspan",
      "Zen Garden",
    ]);

    const byTitle = queryLibrary(all, { ...DEFAULT_PARAMS, sort: "title" });
    expect(byTitle.items[0]?.title).toBe("Arkham");
  });

  it("returns the stored cover shape and colour for the wall", async () => {
    const shapes = await createTestUser("lib-shape");
    const added = await addManualGame(shapes.client, {
      title: "Wide box",
      status: "owned",
    });
    if (!added.ok) throw new Error("setup failed");
    const entry = await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", added.data.entryId)
      .single();
    const wide = await sharp({
      create: { width: 1600, height: 1000, channels: 3, background: "#c8402a" },
    })
      .png()
      .toBuffer();
    const upload = await uploadCover(shapes.client, shapes.id, {
      gameId: entry.data!.game_id as string,
      file: new File([new Uint8Array(wide)], "wide.png", { type: "image/png" }),
    });
    expect(upload.ok).toBe(true);
    const library = await listLibrary(shapes.client, shapes.id);
    const item = library.ok ? library.data[0] : undefined;
    expect(item?.coverWidth).toBe(1200);
    expect(item?.coverHeight).toBe(750);
    expect(item?.accent).toMatch(/^#[0-9a-f]{6}$/);
    // Clean up the stored files.
    const row = await admin
      .from("game_images")
      .select("storage_path")
      .eq("game_id", entry.data!.game_id as string)
      .single();
    const path = row.data!.storage_path as string;
    await admin.storage
      .from("covers")
      .remove([path, path.replace("cover.webp", "thumb.webp")]);
  });
});
