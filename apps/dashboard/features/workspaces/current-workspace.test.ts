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

  it("breaks a tie in join time by workspace id, whatever order the memberships come in", () => {
    const joinedAt = new Date("2026-03-01T10:00:00Z");
    const tied = [
      { workspaceId: "ws-b", joinedAt },
      { workspaceId: "ws-a", joinedAt: new Date(joinedAt) },
    ];
    expect(currentWorkspaceId(tied, undefined)).toBe("ws-a");
    expect(currentWorkspaceId([...tied].reverse(), undefined)).toBe("ws-a");
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
