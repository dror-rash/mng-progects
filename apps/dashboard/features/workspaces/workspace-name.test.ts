import { describe, expect, it } from "vitest";

import { confirmsWorkspaceName, parseWorkspaceName, WORKSPACE_NAME_MAX_LENGTH } from "./workspace-name";

describe("parseWorkspaceName", () => {
  it("trims the name and drops control characters", () => {
    expect(parseWorkspaceName("  Acme\u0000 Team ")).toEqual({ ok: true, value: "Acme Team" });
  });

  it("requires a name", () => {
    expect(parseWorkspaceName("   ")).toEqual({ ok: false, error: "Workspace name is required" });
    expect(parseWorkspaceName(null)).toEqual({ ok: false, error: "Workspace name is required" });
  });

  it("accepts a name of exactly 100 characters", () => {
    expect(parseWorkspaceName("x".repeat(100))).toEqual({ ok: true, value: "x".repeat(100) });
  });

  it("rejects a name of 101 characters", () => {
    expect(parseWorkspaceName("x".repeat(101))).toEqual({ ok: false, error: "Workspace name must be 100 characters or fewer" });
  });

  it("exports the limit the inputs use", () => {
    expect(WORKSPACE_NAME_MAX_LENGTH).toBe(100);
  });
});

describe("confirmsWorkspaceName", () => {
  it("accepts the exact name, ignoring surrounding spaces", () => {
    expect(confirmsWorkspaceName("  Acme Team ", "Acme Team")).toBe(true);
  });

  it("rejects a partial, differently cased or missing name", () => {
    expect(confirmsWorkspaceName("Acme", "Acme Team")).toBe(false);
    expect(confirmsWorkspaceName("acme team", "Acme Team")).toBe(false);
    expect(confirmsWorkspaceName(null, "Acme Team")).toBe(false);
  });
});
