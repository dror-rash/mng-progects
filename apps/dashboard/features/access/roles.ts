/** Roles per workspace membership (ADR-0006). A `partner` membership also names a partner company. */
export const WORKSPACE_ROLES = [
  { role: "admin", label: "Admin" },
  { role: "auditor", label: "Auditor" },
  { role: "partner", label: "Partner" },
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]["role"];

export function parseWorkspaceRole(value: unknown): WorkspaceRole | null {
  return WORKSPACE_ROLES.find((r) => r.role === value)?.role ?? null;
}

/** The roles an admin gives without a partner company; a partner's user is a `RoleChoice` with one. */
export const ASSIGNABLE_ROLES = WORKSPACE_ROLES.filter((r) => r.role !== "partner");

export type AssignableRole = Exclude<WorkspaceRole, "partner">;

export function parseAssignableRole(value: unknown): AssignableRole | null {
  const role = parseWorkspaceRole(value);
  return role === "admin" || role === "auditor" ? role : null;
}

/**
 * What an admin chooses for an invite link or a member (one select): Admin, Auditor, or a partner
 * company's user. The server still checks that the partner is one of the workspace's.
 */
export type RoleChoice = { role: AssignableRole; partnerId: null } | { role: "partner"; partnerId: string };

const PARTNER_PREFIX = "partner:";

/** The select option value for a role: `admin`, `auditor` or `partner:<partner id>`. */
export function roleChoiceValue(role: string, partnerId: string | null): string {
  return role === "partner" && partnerId ? `${PARTNER_PREFIX}${partnerId}` : role;
}

export function parseRoleChoice(value: unknown): RoleChoice | null {
  if (typeof value === "string" && value.startsWith(PARTNER_PREFIX)) {
    const partnerId = value.slice(PARTNER_PREFIX.length);
    return partnerId ? { role: "partner", partnerId } : null;
  }
  const role = parseAssignableRole(value);
  return role ? { role, partnerId: null } : null;
}

/** A role as people read it: "Partner: Northwind" for a partner's user (just "Partner" without the name). */
export function roleChoiceLabel(role: string, partnerName: string | null): string {
  return role === "partner" && partnerName ? `Partner: ${partnerName}` : workspaceRoleLabel(role);
}

/** A stored role, with anything unknown read as the least privileged one (auditor: sees, never changes). */
export function normalizeWorkspaceRole(value: unknown): WorkspaceRole {
  return parseWorkspaceRole(value) ?? "auditor";
}

export function workspaceRoleLabel(value: string): string {
  return WORKSPACE_ROLES.find((r) => r.role === value)?.label ?? value;
}

/**
 * Whether a workspace still has an admin after `change`: a new role for `userId`, or `null` when they
 * leave or are removed. A workspace must always keep at least one admin (ADR-0005).
 */
export function keepsAnAdmin(
  members: { userId: string; role: string }[],
  change: { userId: string; role: WorkspaceRole | null },
): boolean {
  return members.some((m) => (m.userId === change.userId ? change.role : m.role) === "admin");
}
