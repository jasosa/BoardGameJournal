import { describe, expect, it } from "vitest";
import {
  COVER_LONG_SIDE,
  COVER_MAX_RATIO,
  COVER_MIN_RATIO,
  coverDimensions,
  usableCoverShape,
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

  it("keeps the shape of a cover, with the longer side at the target", () => {
    expect(coverDimensions(600, 800, 1200)).toEqual({
      width: 900,
      height: 1200,
    });
    expect(coverDimensions(1000, 1500, 1200)).toEqual({
      width: 800,
      height: 1200,
    });
    expect(coverDimensions(1600, 1200, 1200)).toEqual({
      width: 1200,
      height: 900,
    });
    expect(coverDimensions(300, 300, 480)).toEqual({ width: 480, height: 480 });
  });

  it("limits very wide and very tall pictures to the allowed range", () => {
    const wide = coverDimensions(4000, 1000, COVER_LONG_SIDE.cover);
    expect(wide.width / wide.height).toBeCloseTo(COVER_MAX_RATIO, 1);
    const tall = coverDimensions(500, 3000, COVER_LONG_SIDE.cover);
    expect(tall.width / tall.height).toBeCloseTo(COVER_MIN_RATIO, 1);
    expect(Math.max(wide.width, wide.height)).toBe(1200);
    expect(Math.max(tall.width, tall.height)).toBe(1200);
  });

  it("only lets the wall use sane stored sizes", () => {
    expect(usableCoverShape(1200, 750)).toEqual({ width: 1200, height: 750 });
    expect(usableCoverShape(null, 750)).toBeNull();
    expect(usableCoverShape(0, 750)).toBeNull();
    expect(usableCoverShape(-5, 750)).toBeNull();
    expect(usableCoverShape(Number.NaN, 750)).toBeNull();
    // A hand-edited row cannot make a tile absurdly thin or flat.
    const thin = usableCoverShape(1, 2_147_483_647);
    expect(thin && thin.width / thin.height).toBeCloseTo(COVER_MIN_RATIO, 5);
    const flat = usableCoverShape(2_147_483_647, 1);
    expect(flat && flat.width / flat.height).toBeCloseTo(COVER_MAX_RATIO, 5);
  });
});
