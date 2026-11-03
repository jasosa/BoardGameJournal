import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  COVER_LONG_SIDE,
  COVER_MAX_BYTES,
  coverDimensions,
} from "@/features/catalogue/cover";
import { processCover } from "./process-cover";

const solid = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 60, b: 40 },
    },
  });

async function expectCover(bytes: Uint8Array) {
  const result = await processCover(bytes);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected a processed cover");
  const cover = await sharp(result.data.cover).metadata();
  const thumb = await sharp(result.data.thumb).metadata();
  return { cover, thumb, result };
}

describe("processCover", () => {
  it.each([
    ["PNG", 2000, 1000, () => solid(2000, 1000).png().toBuffer()],
    ["JPEG", 1000, 1500, () => solid(1000, 1500).jpeg().toBuffer()],
    ["WebP", 300, 300, () => solid(300, 300).webp().toBuffer()],
    ["tall PNG", 500, 3000, () => solid(500, 3000).png().toBuffer()],
  ])(
    "turns a %s into WebP files that keep their shape",
    async (_name, width, height, make) => {
      const { cover, thumb, result } = await expectCover(await make());
      const expectedCover = coverDimensions(
        width,
        height,
        COVER_LONG_SIDE.cover,
      );
      const expectedThumb = coverDimensions(
        expectedCover.width,
        expectedCover.height,
        COVER_LONG_SIDE.thumb,
      );
      expect(cover.format).toBe("webp");
      expect([cover.width, cover.height]).toEqual([
        expectedCover.width,
        expectedCover.height,
      ]);
      expect([thumb.width, thumb.height]).toEqual([
        expectedThumb.width,
        expectedThumb.height,
      ]);
      // The stored size is reported with the files.
      expect(result.ok && [result.data.width, result.data.height]).toEqual([
        expectedCover.width,
        expectedCover.height,
      ]);
    },
  );

  it("gives a landscape and a portrait picture different shapes", async () => {
    const landscape = await expectCover(
      await solid(1600, 1200).png().toBuffer(),
    );
    const portrait = await expectCover(
      await solid(1200, 1600).png().toBuffer(),
    );
    expect(landscape.cover.width).toBeGreaterThan(landscape.cover.height ?? 0);
    expect(portrait.cover.width).toBeLessThan(portrait.cover.height ?? 0);
  });

  it("applies the camera orientation before choosing the shape", async () => {
    // Stored 1200x800 but marked "rotate 90 degrees": it is really a portrait picture.
    const rotated = await solid(1200, 800)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const { cover } = await expectCover(rotated);
    expect(cover.width).toBeLessThan(cover.height ?? 0);
  });

  it("removes camera and location metadata", async () => {
    const withMetadata = await solid(800, 600)
      .jpeg()
      .withExif({
        IFD0: { ImageDescription: "secret place", Make: "PhoneCo" },
        IFD3: { GPSLatitudeRef: "N", GPSLongitudeRef: "E" },
      })
      .toBuffer();
    // The input really does carry the metadata.
    expect((await sharp(withMetadata).metadata()).exif).toBeDefined();

    const { cover, thumb, result } = await expectCover(withMetadata);
    for (const meta of [cover, thumb]) {
      expect(meta.exif).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
    }
    expect(
      result.ok && result.data.cover.includes(Buffer.from("secret place")),
    ).toBe(false);
  });

  it("applies the camera orientation instead of keeping a rotation tag", async () => {
    // Wide image tagged "rotate 90 degrees". After rotating, it is tall.
    const tagged = await solid(400, 200)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const { cover } = await expectCover(tagged);
    expect(cover.orientation).toBeUndefined();
  });

  it("rejects bytes that are not an image, without handing them to the image library", async () => {
    const result = await processCover(Buffer.from("definitely not an image"));
    expect(result).toMatchObject({
      ok: false,
      error: { code: "unsupported_type" },
    });
  });

  it("rejects a damaged image that has a valid header", async () => {
    const good = await solid(600, 800).jpeg().toBuffer();
    // Keep the header, cut off the picture data.
    const damaged = good.subarray(0, 300);
    const result = await processCover(damaged);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_image" },
    });
  });

  it("handles several images at once", async () => {
    const images = await Promise.all(
      [10, 80, 150, 220, 40].map((r) =>
        sharp({
          create: {
            width: 1200,
            height: 1600,
            channels: 3,
            background: { r, g: 90, b: 60 },
          },
        })
          .png()
          .toBuffer(),
      ),
    );
    const results = await Promise.all(
      images.map((bytes) => processCover(bytes)),
    );
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("rejects an empty file", async () => {
    const result = await processCover(new Uint8Array());
    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_image" },
    });
  });

  it("rejects SVG and GIF even though they are images", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    );
    expect(await processCover(svg)).toMatchObject({
      ok: false,
      error: { code: "unsupported_type" },
    });
    const gif = await solid(20, 20).gif().toBuffer();
    expect(await processCover(gif)).toMatchObject({
      ok: false,
      error: { code: "unsupported_type" },
    });
  });

  it("does not trust a misleading file: a PNG saved with a .jpg name is still processed as a PNG", async () => {
    // The processor never sees the name, only the bytes.
    const png = await solid(100, 100).png().toBuffer();
    expect((await processCover(png)).ok).toBe(true);
  });

  it("rejects a file over 10 MB without decoding it", async () => {
    const result = await processCover(new Uint8Array(COVER_MAX_BYTES + 1));
    expect(result).toMatchObject({ ok: false, error: { code: "too_large" } });
  });

  it("rejects an image with too many pixels", async () => {
    // A solid image compresses to a tiny file but expands to about 53 million pixels.
    const bomb = await solid(7300, 7300)
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(bomb.byteLength).toBeLessThan(COVER_MAX_BYTES);
    const result = await processCover(bomb);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_image" },
    });
  }, 60_000);

  it("returns readable colours for the game page", async () => {
    const png = await solid(600, 800).png().toBuffer();
    const result = await processCover(png);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.colours.tint).toMatch(/^#[0-9a-f]{6}$/);
    expect(result.data.colours.glow).toMatch(/^#[0-9a-f]{6}$/);
    // The sample is reddish: red is the strongest channel in both colours.
    for (const hex of [result.data.colours.tint, result.data.colours.glow]) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(r).toBeGreaterThan(g ?? 0);
      expect(r).toBeGreaterThan(b ?? 0);
    }
  }, 60_000);
});
