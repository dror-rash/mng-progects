import type { TaskStatus } from "./task-status";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyActivity = { created: number; completed: number };

/** Start of "this week": exactly seven days before `now`, inclusive. */
export function weekAgo(now: Date): Date {
  return new Date(now.getTime() - WEEK_MS);
}

/**
 * Tasks created and completed in the last seven days. The clock is passed in so tests can pin it.
 * No upper bound: timestamps come from the database clock, which may run slightly ahead of `now`.
 */
export function countThisWeek(tasks: { createdAt: Date; completedAt: Date | null }[], now: Date): WeeklyActivity {
  const since = weekAgo(now).getTime();
  const inWindow = (date: Date | null) => date !== null && date.getTime() >= since;
  return {
    created: tasks.filter((t) => inWindow(t.createdAt)).length,
    completed: tasks.filter((t) => inWindow(t.completedAt)).length,
  };
}

/** Completion time after a status change: stamped on entering Done, kept while staying Done, cleared on leaving. */
export function nextCompletedAt(
  current: { status: string; completedAt: Date | null },
  nextStatus: TaskStatus,
  now: Date,
): Date | null {
  if (nextStatus !== "done") return null;
  return current.status === "done" ? current.completedAt : now;
}
