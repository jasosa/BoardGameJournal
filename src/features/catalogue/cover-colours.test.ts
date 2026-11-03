import { describe, expect, it } from "vitest";
import {
  BASE_HEX,
  GLOW_MIN_CONTRAST,
  TINT_MIN_CONTRAST,
  TEXT_HEX,
  contrastRatio,
  deriveCoverColours,
  isHexColour,
} from "./cover-colours";

const samples = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  grey: { r: 128, g: 128, b: 128 },
  red: { r: 200, g: 30, b: 20 },
  yellow: { r: 240, g: 220, b: 40 },
  teal: { r: 47, g: 111, b: 115 },
  navy: { r: 10, g: 20, b: 60 },
  paleBlue: { r: 190, g: 210, b: 250 },
  brown: { r: 107, g: 74, b: 43 },
};

describe("deriveCoverColours", () => {
  for (const [name, rgb] of Object.entries(samples)) {
    it(`keeps text and base readable for ${name}`, () => {
      const { tint, glow } = deriveCoverColours(rgb);
      expect(isHexColour(tint)).toBe(true);
      expect(isHexColour(glow)).toBe(true);
      // Light text on the tinted backdrop.
      expect(contrastRatio(tint, TEXT_HEX)).toBeGreaterThanOrEqual(
        TINT_MIN_CONTRAST,
      );
      // A line or label in the glow colour on the dark base.
      expect(contrastRatio(glow, BASE_HEX)).toBeGreaterThanOrEqual(
        GLOW_MIN_CONTRAST,
      );
    });
  }

  it("keeps the hue of a saturated cover", () => {
    const { tint, glow } = deriveCoverColours(samples.teal);
    const hueOf = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return (r ?? 0) < (g ?? 0) && (r ?? 0) < (b ?? 0);
    };
    // Teal: red is the weakest channel in both colours.
    expect(hueOf(tint)).toBe(true);
    expect(hueOf(glow)).toBe(true);
  });

  it("gives a neutral colour for grey, black and white covers", () => {
    for (const rgb of [samples.black, samples.white, samples.grey]) {
      const { tint } = deriveCoverColours(rgb);
      const [r, g, b] = [1, 3, 5].map((i) =>
        parseInt(tint.slice(i, i + 2), 16),
      );
      expect(r).toBe(g);
      expect(g).toBe(b);
    }
  });

  it("makes the tint darker than the glow", () => {
    for (const rgb of Object.values(samples)) {
      const { tint, glow } = deriveCoverColours(rgb);
      expect(contrastRatio(glow, BASE_HEX)).toBeGreaterThan(
        contrastRatio(tint, BASE_HEX),
      );
    }
  });
});

describe("isHexColour", () => {
  it("accepts #rrggbb in lower case only", () => {
    expect(isHexColour("#0a1b2c")).toBe(true);
    expect(isHexColour("#0A1B2C")).toBe(false);
    expect(isHexColour("#abc")).toBe(false);
    expect(isHexColour("red")).toBe(false);
    expect(isHexColour(null)).toBe(false);
    expect(isHexColour("#12345g")).toBe(false);
  });
});
