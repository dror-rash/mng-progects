import { asc, eq, getDb, schema } from "@repo/db";

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
