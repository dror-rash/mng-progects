import { parseTaskStatus } from "./task-status";

export type TaskSummary = { total: number; done: number; open: number; completionRate: number };

export function summarizeTasks(tasks: { status: string }[]): TaskSummary {
  const total = tasks.length;
  const done = tasks.filter((t) => parseTaskStatus(t.status) === "done").length;
  return { total, done, open: total - done, completionRate: total === 0 ? 0 : Math.round((done / total) * 100) };
}
