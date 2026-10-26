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

/** A stored priority, with anything unknown treated as the default. */
export function normalizeTaskPriority(value: unknown): TaskPriority {
  return parseTaskPriority(value) ?? DEFAULT_PRIORITY;
}

function rank(value: string): number {
  return TASK_PRIORITIES.findIndex((p) => p.priority === normalizeTaskPriority(value));
}

export function priorityLabel(value: string): string {
  const priority = normalizeTaskPriority(value);
  return TASK_PRIORITIES.find((p) => p.priority === priority)?.label ?? priority;
}

/** Comparator: most urgent first. Array sort is stable, so equal priorities keep their order. */
export function byPriority(a: { priority: string }, b: { priority: string }): number {
  return rank(a.priority) - rank(b.priority);
}
