import { describe, expect, it } from "vitest";

import { visitName } from "./visit-name";

describe("visitName", () => {
  it("is the notes' first line, shortened", () => {
    expect(visitName("Panel replaced\nBreaker 4 trips", "2026-10-30")).toBe("Panel replaced");
    expect(visitName("x".repeat(80), "2026-10-30")).toHaveLength(60);
  });

  it("is the visit's date without notes", () => {
    expect(visitName(null, "2026-10-30")).toBe("Visit on Oct 30, 2026");
    expect(visitName("   ", "2026-10-30")).toBe("Visit on Oct 30, 2026");
  });
});
