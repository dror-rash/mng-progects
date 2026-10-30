import { alias, and, asc, desc, eq, getDb, getTableColumns, ne, schema } from "@repo/db";
import { gte, lt, lte, type SQL, sql } from "@repo/db";

import type { OverviewCount, OverviewWindow } from "@/features/tasks/overview";
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

const countAll = () => sql<number>`count(*)`.mapWith(Number);
const countWhere = (condition: SQL | undefined) => sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

/** Task counts per project and status in the workspace (one row per pair), for progress meters. */
export async function countTasksByProjectAndStatus(workspaceId: string) {
  return getDb()
    .select({ projectId: schema.task.projectId, status: schema.task.status, count: countAll() })
    .from(schema.task)
    .innerJoin(schema.project, eq(schema.task.projectId, schema.project.id))
    .where(eq(schema.project.workspaceId, workspaceId))
    .groupBy(schema.task.projectId, schema.task.status);
}

/**
 * The home page's task counts per status: due before `today`, due from `today` through `dueSoonUntil`,
 * and created / completed since `since` (inclusive, no upper bound: the database clock may run ahead).
 * Timestamps are bound through their column, so they compare in UTC like the stored values.
 */
export async function countWorkspaceOverview(workspaceId: string, window: OverviewWindow): Promise<OverviewCount[]> {
  const { task } = schema;
  return getDb()
    .select({
      status: task.status,
      count: countAll(),
      overdue: countWhere(lt(task.dueDate, window.today)),
      dueSoon: countWhere(and(gte(task.dueDate, window.today), lte(task.dueDate, window.dueSoonUntil))),
      created: countWhere(gte(task.createdAt, window.since)),
      completed: countWhere(gte(task.completedAt, window.since)),
    })
    .from(task)
    .innerJoin(schema.project, eq(task.projectId, schema.project.id))
    .where(eq(schema.project.workspaceId, workspaceId))
    .groupBy(task.status);
}
