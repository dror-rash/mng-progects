import { alias, and, asc, desc, eq, getDb, getTableColumns, gte, lt, lte, ne, schema, type SQL, sql } from "@repo/db";

import type { CalendarDate } from "@/features/tasks/due-dates";
import type { OverviewCount, OverviewWindow } from "@/features/tasks/overview";
import { visibleTo } from "@/features/workspaces/access";

import { DEFAULT_PRIORITY, TASK_PRIORITIES } from "./task-priority";

const assignee = alias(schema.user, "assignee");
const assigneeMembership = alias(schema.workspaceMember, "assignee_membership");

/**
 * The project's tasks, with each task's customer and assignee names (null when none). An assignee who
 * is no longer a member of the project's workspace counts as none.
 */
export async function listProjectTasks(projectId: string) {
  return getDb()
    .select({ ...getTableColumns(schema.task), customerName: schema.organization.name, assigneeName: assignee.name })
    .from(schema.task)
    .innerJoin(schema.project, eq(schema.task.projectId, schema.project.id))
    .leftJoin(schema.organization, eq(schema.task.organizationId, schema.organization.id))
    .leftJoin(
      assigneeMembership,
      and(
        eq(assigneeMembership.userId, schema.task.assigneeId),
        eq(assigneeMembership.workspaceId, schema.project.workspaceId),
      ),
    )
    .leftJoin(assignee, eq(assigneeMembership.userId, assignee.id))
    .where(eq(schema.task.projectId, projectId))
    .orderBy(asc(schema.task.createdAt));
}

/** The task, only if it belongs to `projectId`. Callers check the project is visible to the user (workspace access) first. */
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

/** SQL mirror of `byPriority`: the priority's place in TASK_PRIORITIES, unknown values ranked as the default. */
const priorityRank = sql`case ${schema.task.priority} ${sql.join(
  TASK_PRIORITIES.map((p, i) => sql`when ${p.priority} then ${sql.raw(String(i))}`),
  sql` `,
)} else ${sql.raw(String(TASK_PRIORITIES.findIndex((p) => p.priority === DEFAULT_PRIORITY)))} end`;

/**
 * Open tasks assigned to `userId`, in every workspace they belong to, with project and workspace names.
 * Ordered like `byDueThenPriority`: due date (undated last), priority, created, then id in byte order (as JS).
 */
export async function listMyOpenTasks(userId: string) {
  return getDb()
    .select({
      id: schema.task.id,
      title: schema.task.title,
      status: schema.task.status,
      priority: schema.task.priority,
      dueDate: schema.task.dueDate,
      createdAt: schema.task.createdAt,
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
    )
    .orderBy(
      sql`${schema.task.dueDate} asc nulls last`,
      priorityRank,
      asc(schema.task.createdAt),
      sql`${schema.task.id} collate "C"`,
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

/** Open tasks due before `today`, per project in the workspace (projects with none are left out). */
export async function countOverdueTasksByProject(workspaceId: string, today: CalendarDate) {
  const rows = await getDb()
    .select({ projectId: schema.task.projectId, count: countAll() })
    .from(schema.task)
    .innerJoin(schema.project, eq(schema.task.projectId, schema.project.id))
    .where(and(eq(schema.project.workspaceId, workspaceId), ne(schema.task.status, "done"), lt(schema.task.dueDate, today)))
    .groupBy(schema.task.projectId);
  return new Map(rows.map((r) => [r.projectId, r.count]));
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
