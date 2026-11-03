/**
 * Two colours taken from a cover, for the game page: a dark `tint` for the backdrop and a
 * light `glow` for lines and the pressed state. Both keep the same hue as the cover and are
 * pushed into ranges where the page's text and the base colour stay readable.
 */
export type Rgb = { r: number; g: number; b: number };
export type CoverColours = { tint: string; glow: string };

/** The page's base colour and text colour (see tokens.css). */
export const BASE_HEX = "#121316";
export const TEXT_HEX = "#ece8df";

/** Contrast the page text keeps against the tint, and the glow against the base. */
export const TINT_MIN_CONTRAST = 5.5;
export const GLOW_MIN_CONTRAST = 4.5;

const HEX = /^#[0-9a-f]{6}$/;

export function isHexColour(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function fromHex(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/** WCAG relative luminance. */
function luminance({ r, g, b }: Rgb): number {
  const lin = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(fromHex(a));
  const lb = luminance(fromHex(b));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * `tint`: same hue, medium saturation, dark. Lightness goes down until the page's text has at
 * least 5.5:1 against it (WCAG AA for body text, with margin). `glow`: same hue, lightness goes up until it has at least 4.5:1 against
 * the base, so a line or a label in this colour is readable on the dark page.
 */
export function deriveCoverColours(rgb: Rgb): CoverColours {
  const { h, s } = rgbToHsl(rgb);

  const tintSat = s < 0.06 ? 0 : clamp(s, 0.3, 0.65);
  let tintLight = 0.4;
  let tint = toHex(hslToRgb(h, tintSat, tintLight));
  while (
    tintLight > 0.05 &&
    contrastRatio(tint, TEXT_HEX) < TINT_MIN_CONTRAST
  ) {
    tintLight -= 0.02;
    tint = toHex(hslToRgb(h, tintSat, tintLight));
  }

  const glowSat = s < 0.06 ? 0 : clamp(s, 0.45, 0.85);
  let glowLight = 0.62;
  let glow = toHex(hslToRgb(h, glowSat, glowLight));
  while (
    glowLight < 0.92 &&
    contrastRatio(glow, BASE_HEX) < GLOW_MIN_CONTRAST
  ) {
    glowLight += 0.02;
    glow = toHex(hslToRgb(h, glowSat, glowLight));
  }

  return { tint, glow };
}
