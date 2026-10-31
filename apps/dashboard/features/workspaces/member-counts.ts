import { getDb, inArray, schema, sql, withAccess } from "@repo/db";

/** How many members of each workspace `userId` can see, by workspace id. Only call it with workspaces they belong to. */
export async function memberCounts(userId: string, workspaceIds: string[]): Promise<Map<string, number>> {
  if (workspaceIds.length === 0) return new Map();
  const rows = await withAccess(userId, () =>
    getDb()
      .select({ workspaceId: schema.workspaceMember.workspaceId, count: sql<number>`count(*)::int` })
      .from(schema.workspaceMember)
      .where(inArray(schema.workspaceMember.workspaceId, workspaceIds))
      .groupBy(schema.workspaceMember.workspaceId),
  );
  return new Map(rows.map((r) => [r.workspaceId, r.count]));
}
