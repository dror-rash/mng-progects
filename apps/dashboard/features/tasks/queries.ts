import { alias, and, asc, desc, eq, getDb, getTableColumns, ne, schema } from "@repo/db";

import { visibleTo } from "@/features/workspaces/access";

const assignee = alias(schema.user, "assignee");

/** The project's tasks, with each task's customer and assignee names (null when none). */
export async function listProjectTasks(projectId: string) {
  return getDb()
    .select({ ...getTableColumns(schema.task), customerName: schema.organization.name, assigneeName: assignee.name })
    .from(schema.task)
    .leftJoin(schema.organization, eq(schema.task.organizationId, schema.organization.id))
    .leftJoin(assignee, eq(schema.task.assigneeId, assignee.id))
    .where(eq(schema.task.projectId, projectId))
    .orderBy(asc(schema.task.createdAt));
}

/** Every task in the workspace's projects, with just the fields the overview needs. */
export async function listWorkspaceTaskStatuses(workspaceId: string) {
  return getDb()
    .select({
      projectId: schema.task.projectId,
      status: schema.task.status,
      createdAt: schema.task.createdAt,
      completedAt: schema.task.completedAt,
      dueDate: schema.task.dueDate,
    })
    .from(schema.task)
    .innerJoin(schema.project, eq(schema.task.projectId, schema.project.id))
    .where(eq(schema.project.workspaceId, workspaceId));
}

/** The task, only if it belongs to `projectId`. Callers check project ownership first. */
export async function getProjectTask(projectId: string, taskId: string) {
  const [task] = await getDb()
    .select()
    .from(schema.task)
    .where(and(eq(schema.task.id, taskId), eq(schema.task.projectId, projectId)));
  return task ?? null;
}

/** Open (not Done) tasks about one customer, across the workspace's projects, newest first. */
export async function listCustomerOpenTasks(workspaceId: string, organizationId: string) {
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
        eq(schema.project.workspaceId, workspaceId),
        eq(schema.task.organizationId, organizationId),
        ne(schema.task.status, "done"),
      ),
    )
    .orderBy(desc(schema.task.createdAt));
}

/** Open tasks assigned to `userId`, in every workspace they belong to, with project and workspace names. */
export async function listMyOpenTasks(userId: string) {
  return getDb()
    .select({
      id: schema.task.id,
      title: schema.task.title,
      status: schema.task.status,
      priority: schema.task.priority,
      dueDate: schema.task.dueDate,
      projectId: schema.project.id,
      projectName: schema.project.name,
      workspaceName: schema.workspace.name,
    })
    .from(schema.task)
    .innerJoin(schema.project, eq(schema.task.projectId, schema.project.id))
    .innerJoin(schema.workspace, eq(schema.project.workspaceId, schema.workspace.id))
    .where(
      and(
        eq(schema.task.assigneeId, userId),
        ne(schema.task.status, "done"),
        visibleTo(userId, schema.project.workspaceId),
      ),
    );
}
