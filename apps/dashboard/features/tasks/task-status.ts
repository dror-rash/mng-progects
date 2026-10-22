/** Board columns in workflow order. Add a status here and the board, parsing, and grouping follow. */
export const TASK_STATUSES = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["status"];

const DEFAULT_STATUS: TaskStatus = "todo";

export function parseTaskStatus(value: unknown): TaskStatus | null {
  return TASK_STATUSES.find((s) => s.status === value)?.status ?? null;
}

export function groupTasksByStatus<T extends { status: string }>(tasks: T[]) {
  return TASK_STATUSES.map(({ status, label }) => ({
    status,
    label,
    tasks: tasks.filter((t) => (parseTaskStatus(t.status) ?? DEFAULT_STATUS) === status),
  }));
}
