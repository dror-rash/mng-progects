import { and, desc, eq, getDb, getTableColumns, schema } from "@repo/db";

import { visibleTo } from "@/features/workspaces/access";

/** The project, only if `userId` is a member of its workspace (ADR-0005). */
export async function getProjectForUser(userId: string, projectId: string) {
  const [project] = await getDb()
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, projectId), visibleTo(userId, schema.project.workspaceId)));
  return project ?? null;
}

/** Project columns plus the linked customer's name (null when there's no customer). */
function selectWithCustomer() {
  return getDb()
    .select({ ...getTableColumns(schema.project), customerName: schema.organization.name })
    .from(schema.project)
    .leftJoin(schema.organization, eq(schema.project.organizationId, schema.organization.id));
}

/** The workspace's projects, newest first; pass `limit` for just the most recent. */
export async function listProjects(workspaceId: string, limit?: number) {
  const query = selectWithCustomer()
    .where(eq(schema.project.workspaceId, workspaceId))
    .orderBy(desc(schema.project.createdAt));
  return limit === undefined ? query : query.limit(limit);
}

/** The workspace's projects for one customer, newest first ("previous projects"). */
export async function listCustomerProjects(workspaceId: string, organizationId: string) {
  return selectWithCustomer()
    .where(and(eq(schema.project.workspaceId, workspaceId), eq(schema.project.organizationId, organizationId)))
    .orderBy(desc(schema.project.createdAt));
}

export async function countProjects(workspaceId: string) {
  return getDb().$count(schema.project, eq(schema.project.workspaceId, workspaceId));
}
