import { asc, eq, getDb, schema } from "@repo/db";

export async function listProjectTasks(projectId: string) {
  return getDb()
    .select()
    .from(schema.task)
    .where(eq(schema.task.projectId, projectId))
    .orderBy(asc(schema.task.createdAt));
}

/** Every task in projects `ownerId` owns, with just the fields the overview needs. */
export async function listOwnedTaskStatuses(ownerId: string) {
  return getDb()
    .select({
      projectId: schema.task.projectId,
      status: schema.task.status,
      createdAt: schema.task.createdAt,
      completedAt: schema.task.completedAt,
    })
    .from(schema.task)
    .innerJoin(schema.project, eq(schema.task.projectId, schema.project.id))
    .where(eq(schema.project.ownerId, ownerId));
}
