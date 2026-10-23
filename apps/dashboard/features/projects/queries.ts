import { and, desc, eq, getDb, getTableColumns, schema } from "@repo/db";

/** Returns the project only if `ownerId` owns it, so callers can't leak another user's data. */
export async function getOwnedProject(ownerId: string, projectId: string) {
  const [project] = await getDb()
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, projectId), eq(schema.project.ownerId, ownerId)));
  return project ?? null;
}

/** Project columns plus the linked customer's name (null when there's no customer). */
function selectWithCustomer() {
  return getDb()
    .select({ ...getTableColumns(schema.project), customerName: schema.organization.name })
    .from(schema.project)
    .leftJoin(schema.organization, eq(schema.project.organizationId, schema.organization.id));
}

/** The owner's projects, newest first; pass `limit` for just the most recent. */
export async function listProjects(ownerId: string, limit?: number) {
  const query = selectWithCustomer().where(eq(schema.project.ownerId, ownerId)).orderBy(desc(schema.project.createdAt));
  return limit === undefined ? query : query.limit(limit);
}

/** The owner's projects for one customer, newest first ("previous projects"). */
export async function listCustomerProjects(ownerId: string, organizationId: string) {
  return selectWithCustomer()
    .where(and(eq(schema.project.ownerId, ownerId), eq(schema.project.organizationId, organizationId)))
    .orderBy(desc(schema.project.createdAt));
}

export async function countProjects(ownerId: string) {
  return getDb().$count(schema.project, eq(schema.project.ownerId, ownerId));
}
