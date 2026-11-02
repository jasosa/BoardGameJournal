import { z } from "zod";

/** Largest image a person may upload. */
export const COVER_MAX_BYTES = 10 * 1024 * 1024;

/** What the file picker offers. iPhones convert HEIC photos to JPEG for these types. */
export const COVER_ACCEPT = "image/jpeg,image/png,image/webp";

/** Every cover is stored at a 3:4 ratio in two sizes. */
export const COVER_SIZES = {
  cover: { width: 900, height: 1200 },
  thumb: { width: 360, height: 480 },
} as const;

export type CoverSize = keyof typeof COVER_SIZES;

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
