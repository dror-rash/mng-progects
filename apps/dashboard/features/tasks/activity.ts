import type { TaskStatus } from "./task-status";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyActivity = { created: number; completed: number };

/**
 * Start of "this week": exactly seven days before `now`, inclusive. The clock is passed in so tests can pin it.
 * Queries use no upper bound: timestamps come from the database clock, which may run slightly ahead of `now`.
 */
export function weekAgo(now: Date): Date {
  return new Date(now.getTime() - WEEK_MS);
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
