"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  type ThemePreference,
} from "@/lib/design-system/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const CHANGE_EVENT = "theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function apply(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked: still apply for this page view.
  }
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = resolveTheme(preference, dark);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(
    subscribe,
    readPreference,
    (): ThemePreference => "system",
  );
  return (
    <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={preference === option.value}
          onClick={() => apply(option.value)}
          className="border-line text-ink-soft aria-pressed:border-bronze aria-pressed:bg-cream aria-pressed:text-ink duration-fast rounded-input min-h-11 border px-4 text-sm transition-colors"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
