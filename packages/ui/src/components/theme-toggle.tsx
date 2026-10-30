"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { type Theme, THEMES, themeCookie, themeLabel } from "../lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

type ThemeToggleProps = {
  /** The theme the server rendered with (from the theme cookie). */
  theme: Theme;
  className?: string;
};

/** Light / Dark / System. Stores the choice in a cookie every zone reads, and applies it at once. */
export function ThemeToggle({ theme: initial, className }: ThemeToggleProps) {
  const [theme, setTheme] = React.useState<Theme>(initial);

  // While on "system", follow OS changes without a reload.
  React.useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia(DARK_QUERY);
    const follow = () => applyTheme("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [theme]);

  function choose(next: Theme) {
    document.cookie = themeCookie(next);
    applyTheme(next);
    setTheme(next);
  }

  return (
    <div role="group" aria-label="Theme" className={cn("inline-flex rounded-md border p-0.5", className)}>
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => choose(option)}
          className={cn(
            "rounded-sm px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            theme === option && "bg-secondary text-secondary-foreground",
          )}
        >
          {themeLabel(option)}
        </button>
      ))}
    </div>
  );
}
