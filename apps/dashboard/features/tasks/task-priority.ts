/** Priorities from most to least urgent. Add one here and parsing, labels, and board order follow. */
export const TASK_PRIORITIES = [
  { priority: "high", label: "High" },
  { priority: "medium", label: "Medium" },
  { priority: "low", label: "Low" },
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number]["priority"];

/** The column default; unknown stored values are treated as this too. */
export const DEFAULT_PRIORITY: TaskPriority = "medium";

export function parseTaskPriority(value: unknown): TaskPriority | null {
  return TASK_PRIORITIES.find((p) => p.priority === value)?.priority ?? null;
}

function rank(value: string): number {
  return TASK_PRIORITIES.findIndex((p) => p.priority === (parseTaskPriority(value) ?? DEFAULT_PRIORITY));
}

export function priorityLabel(value: string): string {
  return TASK_PRIORITIES[rank(value)]!.label;
}

/** Comparator: most urgent first. Array sort is stable, so equal priorities keep their order. */
export function byPriority(a: { priority: string }, b: { priority: string }): number {
  return rank(a.priority) - rank(b.priority);
}
