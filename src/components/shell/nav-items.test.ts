import { describe, expect, it } from "vitest";
import { CAPTURE_ITEM, NAV_ITEMS, isActive } from "./nav-items";

describe("nav items", () => {
  it("has unique hrefs and labels", () => {
    const all = [...NAV_ITEMS, CAPTURE_ITEM];
    expect(new Set(all.map((i) => i.href)).size).toBe(all.length);
    expect(new Set(all.map((i) => i.label)).size).toBe(all.length);
  });

  it("matches home only on the exact path", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/library", "/")).toBe(false);
  });

  it("matches nested paths but not look-alike prefixes", () => {
    expect(isActive("/library", "/library")).toBe(true);
    expect(isActive("/library/abc", "/library")).toBe(true);
    expect(isActive("/library-old", "/library")).toBe(false);
  });
});
