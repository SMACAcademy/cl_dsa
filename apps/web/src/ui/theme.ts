export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "av.theme";
export const THEME_PREFS: readonly ThemePref[] = ["light", "dark", "system"];

/** Browser-chrome colour per theme; equals the `--surface` token in index.css (checked by tests). */
export const THEME_COLORS: Record<ResolvedTheme, string> = { light: "#f5f6fa", dark: "#0f1420" };

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemePref(value: unknown): value is ThemePref {
  return typeof value === "string" && (THEME_PREFS as readonly string[]).includes(value);
}

/** The stored preference, or "system". Never throws: storage may be blocked or unavailable. */
export function readThemePref(): ThemePref {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePref(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function writeThemePref(pref: ThemePref): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage blocked or full: the choice still applies for this visit.
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

/** Sets `<html data-theme>` to "light" or "dark", resolving "system" through matchMedia. */
export function applyTheme(pref: ThemePref): void {
  const theme = resolveTheme(pref);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

// A tiny external store so React components can subscribe to the preference.
let current: ThemePref | null = null;
const listeners = new Set<() => void>();

export function getThemePref(): ThemePref {
  current ??= readThemePref();
  return current;
}

export function setThemePref(pref: ThemePref): void {
  current = pref;
  writeThemePref(pref);
  applyTheme(pref);
  for (const listener of listeners) listener();
}

export function subscribeThemePref(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-applies the theme when the OS setting changes while the preference is "system". */
export function watchSystemTheme(): () => void {
  let query: MediaQueryList;
  try {
    query = window.matchMedia(DARK_QUERY);
  } catch {
    return () => undefined;
  }
  const onChange = () => {
    if (getThemePref() === "system") applyTheme("system");
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
