import { and, asc, desc, eq, getDb, getTableColumns, ne, schema } from "@repo/db";

/** The project's tasks, with each task's customer name (null when none). */
export async function listProjectTasks(projectId: string) {
  return getDb()
    .select({ ...getTableColumns(schema.task), customerName: schema.organization.name })
    .from(schema.task)
    .leftJoin(schema.organization, eq(schema.task.organizationId, schema.organization.id))
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

/** Open (not Done) tasks about one customer, across the owner's projects, newest first. */
export async function listCustomerOpenTasks(ownerId: string, organizationId: string) {
  return getDb()
    .select({
      id: schema.task.id,
      title: schema.task.title,
      status: schema.task.status,
      projectId: schema.project.id,
      projectName: schema.project.name,
    })
    .from(schema.task)
    .innerJoin(schema.project, eq(schema.task.projectId, schema.project.id))
    .where(
      and(
        eq(schema.project.ownerId, ownerId),
        eq(schema.task.organizationId, organizationId),
        ne(schema.task.status, "done"),
      ),
    )
    .orderBy(desc(schema.task.createdAt));
}
