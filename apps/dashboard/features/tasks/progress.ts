import { parseTaskStatus } from "./task-status";

export type TaskSummary = { total: number; done: number; open: number; completionRate: number };

export function summarizeTasks(tasks: { status: string }[]): TaskSummary {
  const total = tasks.length;
  const done = tasks.filter((t) => parseTaskStatus(t.status) === "done").length;
  return { total, done, open: total - done, completionRate: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** One summary per project, built in a single pass over the tasks. */
export function summarizeByProject(tasks: { projectId: string; status: string }[]): Map<string, TaskSummary> {
  const grouped = new Map<string, { status: string }[]>();
  for (const task of tasks) {
    const list = grouped.get(task.projectId);
    if (list) list.push(task);
    else grouped.set(task.projectId, [task]);
  }
  return new Map([...grouped].map(([projectId, list]) => [projectId, summarizeTasks(list)]));
}
