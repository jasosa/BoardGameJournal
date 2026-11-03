import "server-only";
import sharp from "sharp";
import {
  COVER_LONG_SIDE,
  COVER_MAX_BYTES,
  coverDimensions,
} from "@/features/catalogue/cover";
import {
  deriveCoverColours,
  type CoverColours,
} from "@/features/catalogue/cover-colours";
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

export type ProcessedCover = {
  cover: Buffer;
  thumb: Buffer;
  /** Size of the stored cover file (its own shape, within the allowed range). */
  width: number;
  height: number;
  /** Colours for the game page, taken from the finished thumbnail. */
  colours: CoverColours;
};

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
 * a WebP that keeps its own shape (within a range) with every piece of metadata removed (photos from phones carry GPS and camera
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
      // The shape comes from the header (after the camera orientation), so the image is decoded
      // once. The thumbnail is made from the finished cover, not from the original.
      const options = {
        limitInputPixels: MAX_INPUT_PIXELS,
        failOn: "error",
      } as const;
      const meta = await sharp(bytes, options).metadata();
      const turned = (meta.orientation ?? 1) >= 5;
      const [w, h] = turned
        ? [meta.height ?? 0, meta.width ?? 0]
        : [meta.width ?? 0, meta.height ?? 0];
      if (w <= 0 || h <= 0) {
        return err("invalid_image", "We could not read that image.");
      }
      const size = coverDimensions(w, h, COVER_LONG_SIDE.cover);

      const cover = await sharp(bytes, options)
        .rotate() // apply the camera orientation, then drop the tag
        .resize(size.width, size.height, { fit: "cover" })
        .webp({ quality: 82 })
        .toBuffer(); // metadata is not copied unless asked for

      const thumbSize = coverDimensions(
        size.width,
        size.height,
        COVER_LONG_SIDE.thumb,
      );
      const thumb = await sharp(cover)
        .resize(thumbSize.width, thumbSize.height, { fit: "cover" })
        .webp({ quality: 82 })
        .toBuffer();

      const { dominant } = await sharp(thumb).stats();
      return ok({
        cover,
        thumb,
        width: size.width,
        height: size.height,
        colours: deriveCoverColours(dominant),
      });
    } catch {
      // A damaged image, or one over the pixel limit.
      return err("invalid_image", "We could not read that image.");
    }
  });
}
