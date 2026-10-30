import { workspaceRoleLabel } from "./roles";

/** What tells same-named workspaces apart in the switcher: "Admin · 3 members". */
export function workspaceDetails({ role, memberCount }: { role: string; memberCount: number }): string {
  return `${workspaceRoleLabel(role)} · ${memberCount} ${memberCount === 1 ? "member" : "members"}`;
}
