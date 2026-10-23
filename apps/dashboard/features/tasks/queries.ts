import { and, asc, eq, getDb, schema } from "@repo/db";

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

/** The task, only if it belongs to `projectId`. Callers check project ownership first. */
export async function getProjectTask(projectId: string, taskId: string) {
  const [task] = await getDb()
    .select()
    .from(schema.task)
    .where(and(eq(schema.task.id, taskId), eq(schema.task.projectId, projectId)));
  return task ?? null;
}
