import "server-only";
import sharp from "sharp";
import { COVER_MAX_BYTES, COVER_SIZES } from "@/features/catalogue/cover";
import { err, ok, type Result } from "@/lib/result";

/**
 * Decoded pixel limit. Guards against small files that expand to huge images, and keeps memory
 * use bounded: 40 million pixels is about 120 MB decoded. Phone photos are 12 to 24 million.
 */
const MAX_INPUT_PIXELS = 40_000_000;

/** Decoding is memory hungry, so only a few images are processed at once. */
const MAX_CONCURRENT = 2;

// Do not keep decoded images cached between requests.
sharp.cache(false);

export type ProcessedCover = { cover: Buffer; thumb: Buffer };

let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

/** True when the first bytes say JPEG, PNG or WebP. Nothing else reaches the image library. */
function hasAllowedSignature(bytes: Uint8Array): boolean {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const jpeg = starts(0xff, 0xd8, 0xff);
  const png = starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  // "RIFF" + 4 size bytes + "WEBP"
  const webp =
    starts(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return jpeg || png || webp;
}

/**
 * Turns an uploaded image into the two files we store. The format is read from the bytes, not
 * from the file name or the type the browser reported, and only JPEG, PNG and WebP are ever
 * handed to the image library (so SVG, GIF, TIFF and the like never get decoded). The result is
 * a 3:4 WebP with every piece of metadata removed (photos from phones carry GPS and camera
 * details). The original is never kept.
 */
export async function processCover(
  bytes: Uint8Array,
): Promise<Result<ProcessedCover>> {
  if (bytes.byteLength === 0) {
    return err("invalid_image", "We could not read that image.");
  }
  if (bytes.byteLength > COVER_MAX_BYTES) {
    return err("too_large", "That image is larger than 10 MB.");
  }
  if (!hasAllowedSignature(bytes)) {
    return err("unsupported_type", "Use a JPEG, PNG or WebP image.");
  }

  return withSlot(async () => {
    try {
      // Decode once. The thumbnail is made from the finished cover, not from the original.
      const cover = await sharp(bytes, {
        limitInputPixels: MAX_INPUT_PIXELS,
        failOn: "error",
      })
        .rotate() // apply the camera orientation, then drop the tag
        .resize(COVER_SIZES.cover.width, COVER_SIZES.cover.height, {
          fit: "cover",
        })
        .webp({ quality: 82 })
        .toBuffer(); // metadata is not copied unless asked for

      const thumb = await sharp(cover)
        .resize(COVER_SIZES.thumb.width, COVER_SIZES.thumb.height, {
          fit: "cover",
        })
        .webp({ quality: 82 })
        .toBuffer();

      return ok({ cover, thumb });
    } catch {
      // A damaged image, or one over the pixel limit.
      return err("invalid_image", "We could not read that image.");
    }
  });
}
