const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyActivity = { created: number; completed: number };

/** Tasks created and completed in the seven days up to `now`. The clock is passed in so tests can pin it. */
export function countThisWeek(tasks: { createdAt: Date; completedAt: Date | null }[], now: Date): WeeklyActivity {
  const since = now.getTime() - WEEK_MS;
  const inWindow = (date: Date | null) => date !== null && date.getTime() >= since && date.getTime() <= now.getTime();
  return {
    created: tasks.filter((t) => inWindow(t.createdAt)).length,
    completed: tasks.filter((t) => inWindow(t.completedAt)).length,
  };
}
