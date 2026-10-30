import { describe, expect, it } from "vitest";

import { headerWorkspace } from "./header-workspace";

const current = { id: "ws-a", name: "Acme" };
const memberships = [
  { workspaceId: "ws-a", name: "Acme" },
  { workspaceId: "ws-b", name: "Beta" },
];

describe("headerWorkspace", () => {
  it("shows the current workspace when the record is in it", () => {
    expect(headerWorkspace(current, "ws-a", memberships)).toEqual({ workspaceName: "Acme", otherWorkspace: false });
  });

  it("shows the record's workspace when it is another of mine", () => {
    expect(headerWorkspace(current, "ws-b", memberships)).toEqual({ workspaceName: "Beta", otherWorkspace: true });
  });

  it("falls back to the current workspace when the record's isn't one of mine", () => {
    expect(headerWorkspace(current, "ws-x", memberships)).toEqual({ workspaceName: "Acme", otherWorkspace: false });
  });
});
