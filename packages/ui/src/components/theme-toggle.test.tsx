import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "./theme-toggle";

function prefersDark(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function clearThemeCookie() {
  document.cookie = "theme=; path=/; max-age=0";
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    prefersDark(false);
    document.documentElement.className = "";
    clearThemeCookie();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    clearThemeCookie();
  });

  it("marks the current theme as pressed", () => {
    render(<ThemeToggle theme="dark" />);

    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "false");
  });

  it("stores dark in a site-wide cookie and darkens the page when Dark is chosen", async () => {
    render(<ThemeToggle theme="light" />);

    await userEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(document.cookie).toContain("theme=dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("removes the dark class when Light is chosen", async () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle theme="dark" />);

    await userEvent.click(screen.getByRole("button", { name: "Light" }));

    expect(document.cookie).toContain("theme=light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("follows the OS setting when System is chosen", async () => {
    prefersDark(true);
    render(<ThemeToggle theme="light" />);

    await userEvent.click(screen.getByRole("button", { name: "System" }));

    expect(document.cookie).toContain("theme=system");
    expect(document.documentElement).toHaveClass("dark");
  });
});
