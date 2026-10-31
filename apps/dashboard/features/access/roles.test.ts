import { describe, expect, it } from "vitest";

import {
  ASSIGNABLE_ROLES,
  keepsAnAdmin,
  normalizeWorkspaceRole,
  parseAssignableRole,
  parseRoleChoice,
  roleChoiceLabel,
  roleChoiceValue,
  parseWorkspaceRole,
  WORKSPACE_ROLES,
  workspaceRoleLabel,
} from "./roles";

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

describe("parseAssignableRole", () => {
  it("accepts the roles an admin gives on the members page or an invite link", () => {
    expect(ASSIGNABLE_ROLES.map((r) => r.label)).toEqual(["Admin", "Auditor"]);
    expect(parseAssignableRole("admin")).toBe("admin");
    expect(parseAssignableRole("auditor")).toBe("auditor");
  });

  it("rejects partner, which needs a partner company, and unknown roles", () => {
    expect(parseAssignableRole("partner")).toBeNull();
    expect(parseAssignableRole("member")).toBeNull();
  });
});

describe("normalizeWorkspaceRole", () => {
  it("keeps a known stored role", () => {
    expect(normalizeWorkspaceRole("admin")).toBe("admin");
  });

  it("treats an unknown stored role as the least privileged, auditor", () => {
    expect(normalizeWorkspaceRole("member")).toBe("auditor");
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

describe("role choices (invite links and the members page)", () => {
  it("reads admin and auditor without a partner", () => {
    expect(parseRoleChoice("admin")).toEqual({ role: "admin", partnerId: null });
    expect(parseRoleChoice("auditor")).toEqual({ role: "auditor", partnerId: null });
  });

  it("reads a partner choice with its partner company", () => {
    expect(parseRoleChoice("partner:p-1")).toEqual({ role: "partner", partnerId: "p-1" });
  });

  it("rejects a partner without a company, unknown roles and missing values", () => {
    expect(parseRoleChoice("partner")).toBeNull();
    expect(parseRoleChoice("partner:")).toBeNull();
    expect(parseRoleChoice("member")).toBeNull();
    expect(parseRoleChoice(null)).toBeNull();
  });

  it("writes the value a select option carries", () => {
    expect(roleChoiceValue("admin", null)).toBe("admin");
    expect(roleChoiceValue("partner", "p-1")).toBe("partner:p-1");
    expect(parseRoleChoice(roleChoiceValue("partner", "p-1"))).toEqual({ role: "partner", partnerId: "p-1" });
  });

  it("labels a partner choice with the partner's name", () => {
    expect(roleChoiceLabel("auditor", null)).toBe("Auditor");
    expect(roleChoiceLabel("partner", "Northwind")).toBe("Partner: Northwind");
    expect(roleChoiceLabel("partner", null)).toBe("Partner");
  });
});
