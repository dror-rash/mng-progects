import { parseTaskStatus } from "./task-status";

export type TaskSummary = { total: number; done: number; open: number; completionRate: number };

/** A `GROUP BY status` row: how many tasks have this status. */
export type StatusCount = { status: string; count: number };

export function summarizeTasks(tasks: { status: string }[]): TaskSummary {
  return summarizeStatusCounts(tasks.map((t) => ({ status: t.status, count: 1 })));
}

/** The summary from counts grouped by status; an unknown status counts as open. */
export function summarizeStatusCounts(rows: StatusCount[]): TaskSummary {
  let total = 0;
  let done = 0;
  for (const row of rows) {
    total += row.count;
    if (parseTaskStatus(row.status) === "done") done += row.count;
  }
  return { total, done, open: total - done, completionRate: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** One summary per project, from counts grouped by project and status. */
export function summarizeProjectStatusCounts(rows: (StatusCount & { projectId: string })[]): Map<string, TaskSummary> {
  const grouped = new Map<string, StatusCount[]>();
  for (const row of rows) {
    const list = grouped.get(row.projectId);
    if (list) list.push(row);
    else grouped.set(row.projectId, [row]);
  }
  return new Map([...grouped].map(([projectId, list]) => [projectId, summarizeStatusCounts(list)]));
}
