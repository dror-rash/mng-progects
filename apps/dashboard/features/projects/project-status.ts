import type { StatusCount } from "@/features/tasks/progress";
import { parseTaskStatus } from "@/features/tasks/task-status";

import { isCanceled } from "./project-lifecycle";

/**
 * A project's status as lists show it: its progress, derived from its tasks, or "Canceled" once someone
 * cancels it (its lifecycle, `project-lifecycle.ts`).
 */
export const PROJECT_STATUSES = [
  { status: "no_tasks", label: "No tasks" },
  { status: "not_started", label: "Not started" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
  { status: "canceled", label: "Canceled" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["status"];

export function parseProjectStatus(value: unknown): ProjectStatus | null {
  return PROJECT_STATUSES.find((s) => s.status === value)?.status ?? null;
}

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.status === status)!.label;
}

/**
 * From the project's task counts per status (an unknown task status counts as to do), unless the project's
 * stored `lifecycle` is canceled.
 */
export function projectStatus(counts: StatusCount[], lifecycle = "active"): ProjectStatus {
  if (isCanceled(lifecycle)) return "canceled";
  let total = 0;
  let todo = 0;
  let done = 0;
  for (const { status, count } of counts) {
    total += count;
    const parsed = parseTaskStatus(status) ?? "todo";
    if (parsed === "todo") todo += count;
    if (parsed === "done") done += count;
  }
  if (total === 0) return "no_tasks";
  if (done === total) return "done";
  if (todo === total) return "not_started";
  return "in_progress";
}
