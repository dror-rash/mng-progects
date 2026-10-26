import { byPriority } from "./task-priority";

/** "My tasks" order: soonest due date first, undated last, then most urgent. ISO dates compare as strings. */
export function byDueThenPriority(
  a: { dueDate: string | null; priority: string },
  b: { dueDate: string | null; priority: string },
): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return byPriority(a, b);
}
