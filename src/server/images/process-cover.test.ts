import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { COVER_MAX_BYTES, COVER_SIZES } from "@/features/catalogue/cover";
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
    ["PNG", () => solid(2000, 1000).png().toBuffer()],
    ["JPEG", () => solid(1000, 1500).jpeg().toBuffer()],
    ["WebP", () => solid(300, 300).webp().toBuffer()],
  ])("turns a %s into 3:4 WebP files at both sizes", async (_name, make) => {
    const { cover, thumb } = await expectCover(await make());
    expect(cover.format).toBe("webp");
    expect([cover.width, cover.height]).toEqual([
      COVER_SIZES.cover.width,
      COVER_SIZES.cover.height,
    ]);
    expect([thumb.width, thumb.height]).toEqual([
      COVER_SIZES.thumb.width,
      COVER_SIZES.thumb.height,
    ]);
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
});
