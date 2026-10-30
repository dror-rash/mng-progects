import { describe, expect, it } from "vitest";

import { parseTheme, themeClass } from "./theme";

describe("parseTheme", () => {
  it("accepts the known themes", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("system");
  });

  it("falls back to system for a missing or unknown value", () => {
    expect(parseTheme(undefined)).toBe("system");
    expect(parseTheme("purple")).toBe("system");
  });
});

describe("themeClass", () => {
  it("is dark only for the dark theme; system is resolved in the browser", () => {
    expect(themeClass("dark")).toBe("dark");
    expect(themeClass("light")).toBeUndefined();
    expect(themeClass("system")).toBeUndefined();
  });
});
