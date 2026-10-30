/**
 * The colour theme. Stored in a cookie on path=/ so every zone (one origin, through the shell's
 * rewrites) reads it server-side and renders the right class without a flash. Not httpOnly: the
 * toggle writes it in the browser, and it holds nothing sensitive.
 */
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "system";
export const THEME_COOKIE = "theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

export function parseTheme(value: string | undefined | null): Theme {
  return THEMES.find((theme) => theme === value) ?? DEFAULT_THEME;
}

export function themeLabel(theme: Theme): string {
  return LABELS[theme];
}

/** The class the server puts on <html>. "system" depends on the OS, so the browser resolves it. */
export function themeClass(theme: Theme): "dark" | undefined {
  return theme === "dark" ? "dark" : undefined;
}

export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * Inline <head> script for the "system" theme: applies the OS preference before first paint and
 * follows later OS changes while the cookie still says "system" (or is unset).
 */
export const systemThemeScript = `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)");var s=function(){var c=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var t=c?c[1]:"system";if(t!=="light"&&t!=="dark"){document.documentElement.classList.toggle("dark",m.matches)}};s();m.addEventListener("change",s)}catch(e){}})();`;
