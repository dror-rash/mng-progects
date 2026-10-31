import { describe, expect, it } from "vitest";

import { keepsAnAdmin, parseWorkspaceRole, WORKSPACE_ROLES, workspaceRoleLabel } from "./roles";

describe("WORKSPACE_ROLES", () => {
  it("has Admin, Auditor and Partner", () => {
    expect(WORKSPACE_ROLES.map((r) => r.label)).toEqual(["Admin", "Auditor", "Partner"]);
  });
});

describe("parseWorkspaceRole", () => {
  it("accepts a known role and rejects anything else", () => {
    expect(parseWorkspaceRole("admin")).toBe("admin");
    expect(parseWorkspaceRole("auditor")).toBe("auditor");
    expect(parseWorkspaceRole("owner")).toBeNull();
  });

  it("rejects the removed member role", () => {
    expect(parseWorkspaceRole("member")).toBeNull();
  });
});

describe("workspaceRoleLabel", () => {
  it("labels a known role and shows an unknown one as it is", () => {
    expect(workspaceRoleLabel("auditor")).toBe("Auditor");
    expect(workspaceRoleLabel("member")).toBe("member");
  });
});

describe("keepsAnAdmin", () => {
  const members = [
    { userId: "a", role: "admin" },
    { userId: "b", role: "auditor" },
  ];

  it("refuses to remove or demote the last admin", () => {
    expect(keepsAnAdmin(members, { userId: "a", role: null })).toBe(false);
    expect(keepsAnAdmin(members, { userId: "a", role: "auditor" })).toBe(false);
  });

  it("allows it when another admin remains", () => {
    const twoAdmins = [...members, { userId: "c", role: "admin" }];
    expect(keepsAnAdmin(twoAdmins, { userId: "a", role: null })).toBe(true);
  });

  it("allows changes to people who aren't admins", () => {
    expect(keepsAnAdmin(members, { userId: "b", role: null })).toBe(true);
    expect(keepsAnAdmin(members, { userId: "b", role: "admin" })).toBe(true);
  });
});
