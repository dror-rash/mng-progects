import { describe, expect, it } from "vitest";

import { parseWorkspaceName } from "./workspace-name";

describe("parseWorkspaceName", () => {
  it("trims the name and drops control characters", () => {
    expect(parseWorkspaceName("  Acme\u0000 Team ")).toEqual({ ok: true, value: "Acme Team" });
  });

  it("requires a name", () => {
    expect(parseWorkspaceName("   ")).toEqual({ ok: false, error: "Workspace name is required" });
    expect(parseWorkspaceName(null)).toEqual({ ok: false, error: "Workspace name is required" });
  });

  it("limits the length", () => {
    expect(parseWorkspaceName("x".repeat(101))).toEqual({ ok: false, error: "Keep the name under 100 characters" });
  });
});
