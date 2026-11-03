import { z } from "zod";

/** Largest image a person may upload. */
export const COVER_MAX_BYTES = 10 * 1024 * 1024;

/** What the file picker offers. iPhones convert HEIC photos to JPEG for these types. */
export const COVER_ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Covers keep their own proportions. The longer side is scaled to this many pixels (small
 * images are enlarged), in two sizes: the full cover and a thumbnail.
 */
export const COVER_LONG_SIDE = { cover: 1200, thumb: 480 } as const;

/** Widest and narrowest shape kept (width / height). Anything more extreme is cropped to it. */
export const COVER_MIN_RATIO = 0.6;
export const COVER_MAX_RATIO = 1.6;

/**
 * The stored size of a cover as the wall may use it: only sane, positive numbers, with the shape
 * limited to the allowed range. Anything else (a hand-edited row) gives null, and the wall then
 * falls back to 3:4.
 */
export function usableCoverShape(
  width: number | null,
  height: number | null,
): { width: number; height: number } | null {
  if (
    width === null ||
    height === null ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  const ratio = width / height;
  if (ratio >= COVER_MIN_RATIO && ratio <= COVER_MAX_RATIO) {
    return { width, height };
  }
  return ratio > COVER_MAX_RATIO
    ? { width: COVER_MAX_RATIO * 1000, height: 1000 }
    : { width: COVER_MIN_RATIO * 1000, height: 1000 };
}

/** Size to store for a picture of `width` x `height`: its own shape, within the allowed range. */
export function coverDimensions(
  width: number,
  height: number,
  longSide: number,
): { width: number; height: number } {
  const ratio = Math.min(
    COVER_MAX_RATIO,
    Math.max(COVER_MIN_RATIO, width / height),
  );
  return ratio >= 1
    ? { width: longSide, height: Math.round(longSide / ratio) }
    : { width: Math.round(longSide * ratio), height: longSide };
}

export type CoverSize = keyof typeof COVER_LONG_SIDE;

export function isCoverSize(value: unknown): value is CoverSize {
  return value === "cover" || value === "thumb";
}

/** Storage paths of one cover. The first segment is the owner, which storage policies check. */
export function coverPaths(userId: string, gameId: string, imageId: string) {
  const dir = `${userId}/${gameId}/${imageId}`;
  return { dir, cover: `${dir}/cover.webp`, thumb: `${dir}/thumb.webp` };
}

/** Path of one size, given the stored path of the cover file. */
export function pathForSize(storagePath: string, size: CoverSize): string {
  return storagePath.replace(/[^/]+$/, `${size}.webp`);
}

/** A cover as the app passes it around: the row id plus a version that changes on replace. */
export type CoverRef = { imageId: string; version: string };

/** Builds a CoverRef from the stored cover path (`user/game/<version>/cover.webp`). */
export function coverRef(imageId: string, storagePath: string): CoverRef {
  const version = storagePath.split("/")[2] ?? "";
  return { imageId, version };
}

/**
 * URL the browser uses. `v` changes whenever the cover is replaced, so the response can be
 * cached for good and a new cover still shows at once.
 */
export function coverUrl(cover: CoverRef, size: CoverSize = "cover"): string {
  return `/covers/${cover.imageId}?size=${size}&v=${cover.version}`;
}

/** What the upload form must contain. The size and the image itself are checked by the service. */
export const uploadCoverInput = z.object({
  gameId: z.uuid(),
  cover: z.instanceof(File, { error: "Choose an image first." }),
});

export const removeCoverInput = z.object({ gameId: z.uuid() });
