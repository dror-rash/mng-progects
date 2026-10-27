import { type AnyColumn, schema, sql } from "@repo/db";

/**
 * SQL condition: `userId` is a member of the workspace in `workspaceColumn`. The one access rule
 * (ADR-0005) — every record lookup by id goes through it, so another workspace's data stays hidden.
 */
export function visibleTo(userId: string, workspaceColumn: AnyColumn) {
  return sql`exists (select 1 from ${schema.workspaceMember} where ${schema.workspaceMember.workspaceId} = ${workspaceColumn} and ${schema.workspaceMember.userId} = ${userId})`;
}
