/** Cookie that remembers the workspace a user is working in (validated against membership on every request). */
export const WORKSPACE_COOKIE = "workspace";

type Membership = { workspaceId: string; joinedAt: Date };

/**
 * The cookie's workspace if the user belongs to it, otherwise their oldest membership (ties broken by
 * workspace id, as `listMemberships` orders them); null without any.
 */
export function currentWorkspaceId(memberships: Membership[], cookieValue: string | undefined): string | null {
  if (cookieValue && memberships.some((m) => m.workspaceId === cookieValue)) return cookieValue;
  const oldest = [...memberships].sort(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || (a.workspaceId < b.workspaceId ? -1 : a.workspaceId > b.workspaceId ? 1 : 0),
  )[0];
  return oldest?.workspaceId ?? null;
}

export function personalWorkspaceName(userName: string): string {
  const name = userName.trim();
  return name ? `${name}'s workspace` : "My workspace";
}
