import { and, desc, eq, getDb, getTableColumns, isNull, schema, withAccess } from "@repo/db";

import { canChangeProject, canSeeCustomerName, canSeeProject } from "@/features/access/predicates";

/** The project with whether `userId` may change it, only if they can see it (ADR-0006). Not deleted ones. */
export async function getProjectForUser(userId: string, projectId: string) {
  const [project] = await withAccess(userId, () =>
    getDb()
      .select({ ...getTableColumns(schema.project), canChange: canChangeProject(userId, schema.project.id) })
      .from(schema.project)
      .where(and(eq(schema.project.id, projectId), isNull(schema.project.deletedAt), canSeeProject(userId, schema.project.id))),
  );
  return project ?? null;
}

/** Project columns plus the linked customer's name, when `userId` may see it (null otherwise or without one). Inside `withAccess`. */
function selectWithCustomer(userId: string) {
  return getDb()
    .select({ ...getTableColumns(schema.project), customerName: schema.organization.name })
    .from(schema.project)
    .leftJoin(
      schema.organization,
      and(
        eq(schema.project.organizationId, schema.organization.id),
        isNull(schema.organization.deletedAt),
        canSeeCustomerName(userId, schema.organization.id),
      ),
    );
}

/** SQL condition: the projects `userId` can see in a workspace (not deleted). For queries that join `project`. */
export function visibleProjects(userId: string, workspaceId: string) {
  return and(
    eq(schema.project.workspaceId, workspaceId),
    isNull(schema.project.deletedAt),
    canSeeProject(userId, schema.project.id),
  );
}

/** The workspace's projects `userId` can see, newest first; pass `limit` for just the most recent. */
export async function listProjects(userId: string, workspaceId: string, limit?: number) {
  return withAccess(userId, async () => {
    const query = selectWithCustomer(userId)
      .where(visibleProjects(userId, workspaceId))
      .orderBy(desc(schema.project.createdAt));
    return limit === undefined ? query : query.limit(limit);
  });
}

/** The workspace's projects for one customer that `userId` can see, newest first ("previous projects"). */
export async function listCustomerProjects(userId: string, workspaceId: string, organizationId: string) {
  return withAccess(userId, async () =>
    selectWithCustomer(userId)
      .where(and(visibleProjects(userId, workspaceId), eq(schema.project.organizationId, organizationId)))
      .orderBy(desc(schema.project.createdAt)),
  );
}

export async function countProjects(userId: string, workspaceId: string) {
  return withAccess(userId, async () => getDb().$count(schema.project, visibleProjects(userId, workspaceId)));
}
