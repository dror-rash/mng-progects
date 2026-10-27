import { describe, expect, it } from "vitest";

import { keepsAnAdmin, parseWorkspaceRole, WORKSPACE_ROLES } from "./roles";

describe("WORKSPACE_ROLES", () => {
  it("has Admin and Member", () => {
    expect(WORKSPACE_ROLES.map((r) => r.label)).toEqual(["Admin", "Member"]);
  });
});

describe("parseWorkspaceRole", () => {
  it("accepts a known role and rejects anything else", () => {
    expect(parseWorkspaceRole("admin")).toBe("admin");
    expect(parseWorkspaceRole("owner")).toBeNull();
  });
});

describe("keepsAnAdmin", () => {
  const members = [
    { userId: "a", role: "admin" },
    { userId: "b", role: "member" },
  ];

  it("refuses to remove or demote the last admin", () => {
    expect(keepsAnAdmin(members, { userId: "a", role: null })).toBe(false);
    expect(keepsAnAdmin(members, { userId: "a", role: "member" })).toBe(false);
  });

  it("allows it when another admin remains", () => {
    const twoAdmins = [...members, { userId: "c", role: "admin" }];
    expect(keepsAnAdmin(twoAdmins, { userId: "a", role: null })).toBe(true);
  });

  it("allows changes to members", () => {
    expect(keepsAnAdmin(members, { userId: "b", role: null })).toBe(true);
    expect(keepsAnAdmin(members, { userId: "b", role: "admin" })).toBe(true);
  });
});
