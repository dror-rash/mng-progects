import { describe, expect, it } from "vitest";

import { currentWorkspaceId, personalWorkspaceName } from "./current-workspace";

const memberships = [
  { workspaceId: "ws-old", joinedAt: new Date("2026-01-01") },
  { workspaceId: "ws-new", joinedAt: new Date("2026-06-01") },
];

describe("currentWorkspaceId", () => {
  it("uses the workspace from the cookie when the user is a member of it", () => {
    expect(currentWorkspaceId(memberships, "ws-new")).toBe("ws-new");
  });

  it("falls back to the oldest membership when the cookie is missing or not one of theirs", () => {
    expect(currentWorkspaceId(memberships, undefined)).toBe("ws-old");
    expect(currentWorkspaceId(memberships, "someone-elses")).toBe("ws-old");
  });

  it("is null without any membership", () => {
    expect(currentWorkspaceId([], "ws-old")).toBeNull();
  });
});

describe("personalWorkspaceName", () => {
  it("names the workspace after the person", () => {
    expect(personalWorkspaceName("Dana Levi")).toBe("Dana Levi's workspace");
  });

  it("falls back to a generic name when the name is blank", () => {
    expect(personalWorkspaceName("  ")).toBe("My workspace");
  });
});
