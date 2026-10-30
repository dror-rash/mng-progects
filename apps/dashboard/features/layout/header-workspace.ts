type Workspace = { id: string; name: string };

/**
 * The workspace the header names on a record's page: the record's own workspace, flagged when it isn't
 * the current one. Falls back to the current workspace if the record's isn't among `memberships`.
 */
export function headerWorkspace(
  current: Workspace,
  recordWorkspaceId: string,
  memberships: { workspaceId: string; name: string }[],
) {
  const record = recordWorkspaceId === current.id ? undefined : memberships.find((m) => m.workspaceId === recordWorkspaceId);
  return record ? { workspaceName: record.name, otherWorkspace: true } : { workspaceName: current.name, otherWorkspace: false };
}
