export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export function parseThemePreference(raw: string | null): ThemePreference {
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/** Runs before first paint to avoid a flash. Keep in sync with the functions above. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=p==="light"||p==="dark"?p:(d?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){}})();`;
