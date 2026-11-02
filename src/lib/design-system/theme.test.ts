import { describe, expect, it } from "vitest";
import { parseThemePreference, resolveTheme } from "@/lib/design-system/theme";

describe("theme", () => {
  it("parses stored values and defaults to system", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference("nonsense")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
  });

  it("resolves system from the OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("explicit choice wins over the OS preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
