import { and, desc, eq, getDb, schema } from "@repo/db";

/** Returns the project only if `ownerId` owns it, so callers can't leak another user's data. */
export async function getOwnedProject(ownerId: string, projectId: string) {
  const [project] = await getDb()
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, projectId), eq(schema.project.ownerId, ownerId)));
  return project ?? null;
}

/** The owner's projects, newest first; pass `limit` for just the most recent. */
export async function listProjects(ownerId: string, limit?: number) {
  const query = getDb()
    .select()
    .from(schema.project)
    .where(eq(schema.project.ownerId, ownerId))
    .orderBy(desc(schema.project.createdAt));
  return limit === undefined ? query : query.limit(limit);
}

export async function countProjects(ownerId: string) {
  return getDb().$count(schema.project, eq(schema.project.ownerId, ownerId));
}
