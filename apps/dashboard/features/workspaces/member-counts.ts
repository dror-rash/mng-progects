import { getDb, inArray, schema, sql } from "@repo/db";

/** How many members each workspace has, by workspace id. Only call it with workspaces the user belongs to. */
export async function memberCounts(workspaceIds: string[]): Promise<Map<string, number>> {
  if (workspaceIds.length === 0) return new Map();
  const rows = await getDb()
    .select({ workspaceId: schema.workspaceMember.workspaceId, count: sql<number>`count(*)::int` })
    .from(schema.workspaceMember)
    .where(inArray(schema.workspaceMember.workspaceId, workspaceIds))
    .groupBy(schema.workspaceMember.workspaceId);
  return new Map(rows.map((r) => [r.workspaceId, r.count]));
}
