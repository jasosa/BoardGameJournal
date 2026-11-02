import { describe, expect, it } from "vitest";
import {
  COVER_SIZES,
  coverPaths,
  coverRef,
  coverUrl,
  isCoverSize,
  pathForSize,
} from "./cover";

describe("cover helpers", () => {
  it("keeps the owner as the first path segment", () => {
    const paths = coverPaths("user-1", "game-1", "img-1");
    expect(paths.cover).toBe("user-1/game-1/img-1/cover.webp");
    expect(paths.thumb).toBe("user-1/game-1/img-1/thumb.webp");
    expect(paths.cover.split("/")[0]).toBe("user-1");
  });

  it("finds the path of another size from the stored cover path", () => {
    expect(pathForSize("u/g/i/cover.webp", "thumb")).toBe("u/g/i/thumb.webp");
    expect(pathForSize("u/g/i/cover.webp", "cover")).toBe("u/g/i/cover.webp");
  });

  it("builds a url that changes when the cover is replaced", () => {
    const first = coverRef("row-1", "u/g/v1/cover.webp");
    const second = coverRef("row-1", "u/g/v2/cover.webp");
    expect(first).toEqual({ imageId: "row-1", version: "v1" });
    expect(coverUrl(first)).toBe("/covers/row-1?size=cover&v=v1");
    expect(coverUrl(first, "thumb")).toBe("/covers/row-1?size=thumb&v=v1");
    expect(coverUrl(second)).not.toBe(coverUrl(first));
  });

  it("recognises only the known sizes", () => {
    expect(isCoverSize("thumb")).toBe(true);
    expect(isCoverSize("cover")).toBe(true);
    expect(isCoverSize("huge")).toBe(false);
    expect(isCoverSize(null)).toBe(false);
  });

  it("stores covers at a 3:4 ratio", () => {
    for (const { width, height } of Object.values(COVER_SIZES)) {
      expect(width / height).toBe(3 / 4);
    }
  });
});
