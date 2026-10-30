import { byPriority } from "./task-priority";

type MyTask = { id: string; dueDate: string | null; priority: string; createdAt: Date };

/**
 * "My tasks" order: soonest due date first, undated last, then most urgent, then oldest, then id, so
 * ties never shuffle. ISO dates compare as strings. `listMyOpenTasks` mirrors this in SQL.
 */
export function byDueThenPriority(a: MyTask, b: MyTask): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return byPriority(a, b) || a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
