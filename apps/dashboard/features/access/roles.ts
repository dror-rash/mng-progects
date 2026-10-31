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

/** The roles an admin gives on the members page or an invite link. Partner needs a partner company (task 048). */
export const ASSIGNABLE_ROLES = WORKSPACE_ROLES.filter((r) => r.role !== "partner");

export type AssignableRole = Exclude<WorkspaceRole, "partner">;

export function parseAssignableRole(value: unknown): AssignableRole | null {
  const role = parseWorkspaceRole(value);
  return role === "admin" || role === "auditor" ? role : null;
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
