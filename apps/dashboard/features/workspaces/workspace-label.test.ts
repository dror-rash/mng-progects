import { describe, expect, it } from "vitest";

import { workspaceDetails } from "./workspace-label";

describe("workspaceDetails", () => {
  it("shows the role and how many members there are", () => {
    expect(workspaceDetails({ role: "admin", memberCount: 3 })).toBe("Admin · 3 members");
  });

  it("uses the singular for one member", () => {
    expect(workspaceDetails({ role: "auditor", memberCount: 1 })).toBe("Auditor · 1 member");
  });

  it("shows an unknown stored role as it is", () => {
    expect(workspaceDetails({ role: "owner", memberCount: 2 })).toBe("owner · 2 members");
  });
});
