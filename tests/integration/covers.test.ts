import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addManualGame } from "@/server/services/collection";
import { getGameDossier } from "@/server/services/games";
import { removeCover, uploadCover } from "@/server/services/covers";
import { listLibrary } from "@/server/services/collection";
import {
  admin,
  anonymousClient,
  createTestUser,
  deleteTestUsers,
  insertPublicGame,
  type TestUser,
} from "./helpers";

const png = (width = 600, height = 800, r = 200) =>
  sharp({
    create: { width, height, channels: 3, background: { r, g: 60, b: 40 } },
  })
    .png()
    .toBuffer();

const asFile = (bytes: Buffer, name = "box.png", type = "image/png") =>
  new File([new Uint8Array(bytes)], name, { type });

/** Every file path under a storage prefix, two levels deep (game/version/file). */
async function filesUnder(prefix: string): Promise<string[]> {
  const bucket = admin.storage.from("covers");
  const out: string[] = [];
  const top = await bucket.list(prefix);
  for (const entry of top.data ?? []) {
    const inner = await bucket.list(`${prefix}/${entry.name}`);
    for (const file of inner.data ?? [])
      out.push(`${prefix}/${entry.name}/${file.name}`);
  }
  return out;
}

describe("cover upload service and storage bucket", () => {
  let a: TestUser;
  let b: TestUser;
  let gameId: string;
  let publicGameId: string;

  async function newGame(user: TestUser, title: string) {
    const added = await addManualGame(user.client, { title, status: "owned" });
    if (!added.ok) throw new Error("setup failed");
    const entry = await admin
      .from("collection_entries")
      .select("game_id")
      .eq("id", added.data.entryId)
      .single();
    return entry.data!.game_id as string;
  }

  beforeAll(async () => {
    a = await createTestUser("cover-a");
    b = await createTestUser("cover-b");
    gameId = await newGame(a, "Wingspan");
    publicGameId = await insertPublicGame("Provider game");
  });
  afterAll(async () => {
    for (const user of [a, b]) {
      const files: string[] = [];
      const games = await admin.storage.from("covers").list(user.id);
      for (const game of games.data ?? []) {
        files.push(...(await filesUnder(`${user.id}/${game.name}`)));
      }
      if (files.length > 0) await admin.storage.from("covers").remove(files);
    }
    await deleteTestUsers();
    await admin.from("games").delete().eq("id", publicGameId);
  });

  it("stores a processed cover for the owner and shows it in the dossier and library", async () => {
    const result = await uploadCover(a.client, a.id, {
      gameId,
      file: asFile(await png()),
    });
    expect(result.ok).toBe(true);

    const row = await admin
      .from("game_images")
      .select("*")
      .eq("game_id", gameId)
      .single();
    expect(row.data).toMatchObject({
      kind: "cover",
      licence: "own-upload",
      attribution: null,
      width: 900,
      height: 1200,
    });
    expect(row.data!.storage_path.startsWith(`${a.id}/${gameId}/`)).toBe(true);

    const cover = await admin.storage
      .from("covers")
      .download(row.data!.storage_path);
    const meta = await sharp(
      Buffer.from(await cover.data!.arrayBuffer()),
    ).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 900, 1200]);
    const thumbPath = row.data!.storage_path.replace(
      "cover.webp",
      "thumb.webp",
    );
    const thumb = await admin.storage.from("covers").download(thumbPath);
    const thumbMeta = await sharp(
      Buffer.from(await thumb.data!.arrayBuffer()),
    ).metadata();
    expect([thumbMeta.width, thumbMeta.height]).toEqual([360, 480]);

    // The colours for the game page: a #rrggbb tint and glow of the cover's hue (reddish here).
    expect(row.data!.dominant_color).toMatch(/^#[0-9a-f]{6}$/);
    expect(row.data!.accent_color).toMatch(/^#[0-9a-f]{6}$/);

    const dossier = await getGameDossier(a.client, a.id, gameId);
    expect(dossier.ok && dossier.data.game.cover?.imageId).toBe(row.data!.id);
    expect(dossier.ok && dossier.data.game.coverColours).toEqual({
      tint: row.data!.dominant_color,
      glow: row.data!.accent_color,
    });
    const library = await listLibrary(a.client, a.id);
    expect(
      library.ok &&
        library.data.find((i) => i.gameId === gameId)?.cover?.imageId,
    ).toBe(row.data!.id);
  });

  it("replaces the cover in place: same row, new files, old files removed", async () => {
    const before = await admin
      .from("game_images")
      .select("id, storage_path")
      .eq("game_id", gameId)
      .single();
    const result = await uploadCover(a.client, a.id, {
      gameId,
      file: asFile(await png(500, 700, 20)),
    });
    expect(result.ok).toBe(true);

    const after = await admin
      .from("game_images")
      .select("id, storage_path")
      .eq("game_id", gameId);
    expect(after.data).toHaveLength(1);
    expect(after.data![0]!.id).toBe(before.data!.id);
    expect(after.data![0]!.storage_path).not.toBe(before.data!.storage_path);

    const oldFile = await admin.storage
      .from("covers")
      .download(before.data!.storage_path);
    expect(oldFile.error).not.toBeNull();
    const newFile = await admin.storage
      .from("covers")
      .download(after.data![0]!.storage_path);
    expect(newFile.error).toBeNull();
    expect(await filesUnder(`${a.id}/${gameId}`)).toHaveLength(2);
  });

  it("removes the cover, its files, and tolerates removing twice", async () => {
    const removed = await removeCover(a.client, a.id, gameId);
    expect(removed.ok).toBe(true);
    const rows = await admin
      .from("game_images")
      .select("id")
      .eq("game_id", gameId);
    expect(rows.data).toEqual([]);
    expect(await filesUnder(`${a.id}/${gameId}`)).toEqual([]);
    expect((await removeCover(a.client, a.id, gameId)).ok).toBe(true);
  });

  it("rejects files that are not usable images and stores nothing", async () => {
    const bad = [
      asFile(Buffer.from("just some text"), "notes.png", "image/png"),
      asFile(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        "x.svg",
        "image/svg+xml",
      ),
      asFile(Buffer.alloc(0), "empty.png"),
    ];
    for (const file of bad) {
      const result = await uploadCover(a.client, a.id, { gameId, file });
      expect(result.ok).toBe(false);
    }
    const tooBig = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    const big = await uploadCover(a.client, a.id, { gameId, file: tooBig });
    expect(big).toMatchObject({ ok: false, error: { code: "too_large" } });

    expect(
      (await admin.from("game_images").select("id").eq("game_id", gameId)).data,
    ).toEqual([]);
    expect(await filesUnder(`${a.id}/${gameId}`)).toEqual([]);
  });

  it("keeps exactly one cover and no stray files when two uploads race", async () => {
    const [x, y] = await Promise.all([
      uploadCover(a.client, a.id, {
        gameId,
        file: asFile(await png(400, 600, 10)),
      }),
      uploadCover(a.client, a.id, {
        gameId,
        file: asFile(await png(400, 600, 90)),
      }),
    ]);
    expect([x.ok, y.ok].some(Boolean)).toBe(true);
    const rows = await admin
      .from("game_images")
      .select("id, storage_path")
      .eq("game_id", gameId);
    expect(rows.data).toHaveLength(1);
    const files = await filesUnder(`${a.id}/${gameId}`);
    expect(files.sort()).toEqual(
      [
        rows.data![0]!.storage_path,
        rows.data![0]!.storage_path.replace("cover", "thumb"),
      ].sort(),
    );
    await removeCover(a.client, a.id, gameId);
  });

  describe("other people and other games", () => {
    let storedPath: string;

    beforeAll(async () => {
      const ok = await uploadCover(a.client, a.id, {
        gameId,
        file: asFile(await png()),
      });
      expect(ok.ok).toBe(true);
      const row = await admin
        .from("game_images")
        .select("storage_path")
        .eq("game_id", gameId)
        .single();
      storedPath = row.data!.storage_path;
    });

    it("does not let B add or remove a cover on A's game", async () => {
      const upload = await uploadCover(b.client, b.id, {
        gameId,
        file: asFile(await png()),
      });
      expect(upload).toMatchObject({ ok: false, error: { code: "not_found" } });
      const remove = await removeCover(b.client, b.id, gameId);
      expect(remove).toMatchObject({ ok: false, error: { code: "not_found" } });
      expect(
        (await admin.from("game_images").select("id").eq("game_id", gameId))
          .data,
      ).toHaveLength(1);
    });

    it("hides A's cover row and files from B", async () => {
      const rows = await b.client
        .from("game_images")
        .select("id")
        .eq("game_id", gameId);
      expect(rows.data).toEqual([]);
      const download = await b.client.storage
        .from("covers")
        .download(storedPath);
      expect(download.error).not.toBeNull();
      const listing = await b.client.storage
        .from("covers")
        .list(`${a.id}/${gameId}`);
      expect(listing.data ?? []).toEqual([]);
    });

    it("does not let B write into, overwrite or delete in A's folder", async () => {
      const blob = new Blob(
        [
          new Uint8Array(
            await sharp(await png())
              .webp()
              .toBuffer(),
          ),
        ],
        { type: "image/webp" },
      );
      const intoFolder = await b.client.storage
        .from("covers")
        .upload(`${a.id}/${gameId}/evil/cover.webp`, blob);
      expect(intoFolder.error).not.toBeNull();
      const overwrite = await b.client.storage
        .from("covers")
        .upload(storedPath, blob, { upsert: true });
      expect(overwrite.error).not.toBeNull();
      await b.client.storage.from("covers").remove([storedPath]);
      const still = await admin.storage.from("covers").download(storedPath);
      expect(still.error).toBeNull();
    });

    it("does not let A write into another user's folder", async () => {
      const blob = new Blob(
        [
          new Uint8Array(
            await sharp(await png())
              .webp()
              .toBuffer(),
          ),
        ],
        { type: "image/webp" },
      );
      const result = await a.client.storage
        .from("covers")
        .upload(`${b.id}/x/y/cover.webp`, blob);
      expect(result.error).not.toBeNull();
    });

    it("gives anonymous visitors nothing", async () => {
      const anon = anonymousClient();
      expect(
        (await anon.storage.from("covers").download(storedPath)).error,
      ).not.toBeNull();
      expect(
        (await anon.from("game_images").select("id")).error,
      ).not.toBeNull();
    });

    it("accepts only processed WebP of at most 2 MB in the bucket itself", async () => {
      const wrongType = await a.client.storage
        .from("covers")
        .upload(
          `${a.id}/${gameId}/raw/cover.webp`,
          new Blob([new Uint8Array(await png())], { type: "image/png" }),
        );
      expect(wrongType.error).not.toBeNull();
      const tooLarge = await a.client.storage.from("covers").upload(
        `${a.id}/${gameId}/raw/cover.webp`,
        new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], {
          type: "image/webp",
        }),
      );
      expect(tooLarge.error).not.toBeNull();
    });

    it("allows one cover per game in the database", async () => {
      const second = await a.client.from("game_images").insert({
        game_id: gameId,
        kind: "cover",
        storage_path: `${a.id}/${gameId}/dup/cover.webp`,
      });
      expect(second.error).not.toBeNull();
    });

    it("only allows uploads into a folder of a game the person owns", async () => {
      const blob = new Blob(
        [
          new Uint8Array(
            await sharp(await png())
              .webp()
              .toBuffer(),
          ),
        ],
        { type: "image/webp" },
      );
      const storage = a.client.storage.from("covers");
      // A made-up game folder in the person's own space.
      const madeUp = await storage.upload(
        `${a.id}/00000000-0000-4000-8000-000000000000/x/cover.webp`,
        blob,
      );
      expect(madeUp.error).not.toBeNull();
      // Their own space, but another user's game.
      const bGame = await newGame(b, "B's game");
      const others = await storage.upload(
        `${a.id}/${bGame}/x/cover.webp`,
        blob,
      );
      expect(others.error).not.toBeNull();
      // A folder that is not a game id at all.
      const notAGame = await storage.upload(
        `${a.id}/not-a-game/x/cover.webp`,
        blob,
      );
      expect(notAGame.error).not.toBeNull();
      // Their own game works.
      const own = await storage.upload(
        `${a.id}/${gameId}/manual/cover.webp`,
        blob,
      );
      expect(own.error).toBeNull();
      await admin.storage
        .from("covers")
        .remove([`${a.id}/${gameId}/manual/cover.webp`]);
    });

    it("keeps one cover and no stray files when two replaces race", async () => {
      // The game already has a cover from the setup above.
      const [x, y] = await Promise.all([
        uploadCover(a.client, a.id, {
          gameId,
          file: asFile(await png(400, 600, 15)),
        }),
        uploadCover(a.client, a.id, {
          gameId,
          file: asFile(await png(400, 600, 95)),
        }),
      ]);
      expect([x.ok, y.ok].some(Boolean)).toBe(true);
      for (const result of [x, y]) {
        if (!result.ok)
          expect(["conflict", "save_failed"]).toContain(result.error.code);
      }
      const rows = await admin
        .from("game_images")
        .select("storage_path")
        .eq("game_id", gameId);
      expect(rows.data).toHaveLength(1);
      const keep = rows.data![0]!.storage_path;
      expect((await filesUnder(`${a.id}/${gameId}`)).sort()).toEqual(
        [keep, keep.replace("cover", "thumb")].sort(),
      );
    });

    it("treats games that are not the person's own as not_found", async () => {
      const provider = await uploadCover(a.client, a.id, {
        gameId: publicGameId,
        file: asFile(await png()),
      });
      expect(provider).toMatchObject({
        ok: false,
        error: { code: "not_found" },
      });
      const unknown = await uploadCover(a.client, a.id, {
        gameId: "00000000-0000-4000-8000-000000000000",
        file: asFile(await png()),
      });
      expect(unknown).toMatchObject({
        ok: false,
        error: { code: "not_found" },
      });
    });
  });

  it("replacing the cover updates the colours, and a game with no cover has none", async () => {
    const other = await newGame(a, "Colour test");
    const none = await getGameDossier(a.client, a.id, other);
    expect(none.ok && none.data.game.coverColours).toBeNull();

    await uploadCover(a.client, a.id, {
      gameId: other,
      file: asFile(await png(600, 800, 220)),
    });
    const first = await admin
      .from("game_images")
      .select("dominant_color, accent_color")
      .eq("game_id", other)
      .single();
    const blue = await sharp({
      create: {
        width: 600,
        height: 800,
        channels: 3,
        background: { r: 20, g: 40, b: 220 },
      },
    })
      .png()
      .toBuffer();
    await uploadCover(a.client, a.id, { gameId: other, file: asFile(blue) });
    const second = await admin
      .from("game_images")
      .select("dominant_color, accent_color")
      .eq("game_id", other)
      .single();
    expect(second.data!.dominant_color).not.toBe(first.data!.dominant_color);
    expect(second.data!.accent_color).not.toBe(first.data!.accent_color);
  });

  it("the database refuses anything but #rrggbb, and another person cannot change the colours", async () => {
    const row = await admin
      .from("game_images")
      .select("id")
      .eq("game_id", gameId)
      .single();
    for (const bad of ["red", "#FFF", "#ABCDEF", "#12345", "url(x)"]) {
      const { error } = await admin
        .from("game_images")
        .update({ dominant_color: bad })
        .eq("id", row.data!.id);
      expect(error).not.toBeNull();
    }
    const changed = await b.client
      .from("game_images")
      .update({ dominant_color: "#000000" })
      .eq("id", row.data!.id)
      .select("id");
    expect(changed.data ?? []).toEqual([]);
    const after = await admin
      .from("game_images")
      .select("dominant_color")
      .eq("id", row.data!.id)
      .single();
    expect(after.data!.dominant_color).not.toBe("#000000");
  });
});
