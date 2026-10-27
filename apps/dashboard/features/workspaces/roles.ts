export const WORKSPACE_ROLES = [
  { role: "admin", label: "Admin" },
  { role: "member", label: "Member" },
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]["role"];

export function parseWorkspaceRole(value: unknown): WorkspaceRole | null {
  return WORKSPACE_ROLES.find((r) => r.role === value)?.role ?? null;
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
