import { and, asc, eq, getDb, schema } from "@repo/db";

/** Returns the project only if `ownerId` owns it, so callers can't leak another user's data. */
export async function getOwnedProject(ownerId: string, projectId: string) {
  const [project] = await getDb()
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, projectId), eq(schema.project.ownerId, ownerId)));
  return project ?? null;
}

export async function listProjectTasks(projectId: string) {
  return getDb()
    .select()
    .from(schema.task)
    .where(eq(schema.task.projectId, projectId))
    .orderBy(asc(schema.task.createdAt));
}

/** Status of every task in projects `ownerId` owns, for overview stats. */
export async function listOwnedTaskStatuses(ownerId: string) {
  return getDb()
    .select({ projectId: schema.task.projectId, status: schema.task.status })
    .from(schema.task)
    .innerJoin(schema.project, eq(schema.task.projectId, schema.project.id))
    .where(eq(schema.project.ownerId, ownerId));
}
