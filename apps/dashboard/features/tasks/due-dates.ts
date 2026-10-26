import { parseTaskStatus } from "./task-status";

/** A calendar day, "YYYY-MM-DD". Stored as a Postgres `date`, so no time zone can shift it. */
export type CalendarDate = string;

const DUE_SOON_DAYS = 6;

/** Today's calendar date in UTC (time-zone item parked in task 010). */
export function todayUtc(now = new Date()): CalendarDate {
  return now.toISOString().slice(0, 10);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * How urgent a due date is for an open task: past it, due today through six days from now, or later.
 * Done tasks and tasks without a date have no due state. ISO dates compare correctly as strings.
 */
export function dueState(
  dueDate: CalendarDate | null,
  status: string,
  today: CalendarDate,
): "overdue" | "due-soon" | "later" | null {
  if (!dueDate || parseTaskStatus(status) === "done") return null;
  if (dueDate < today) return "overdue";
  if (dueDate <= addDays(today, DUE_SOON_DAYS)) return "due-soon";
  return "later";
}

// Postgres refuses year 0, and a year like 0026 is a typo that would stay overdue forever.
export const MIN_DUE_DATE: CalendarDate = "1900-01-01";
export const MAX_DUE_DATE: CalendarDate = "2999-12-31";

/**
 * Form value → `{ ok: true, value }` with a date, `null` when cleared, or `undefined` when the form has
 * no such field (quick add); `{ ok: false }` for anything that isn't a real date in 1900–2999.
 */
export function parseDueDate(
  value: FormDataEntryValue | null,
): { ok: true; value: CalendarDate | null | undefined } | { ok: false } {
  if (value === null) return { ok: true, value: undefined };
  const text = String(value).trim();
  if (!text) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || text < MIN_DUE_DATE || text > MAX_DUE_DATE) return { ok: false };
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text ? { ok: true, value: text } : { ok: false };
}

// Formatted in UTC: the date is a calendar day, and the server's own time zone must not shift it.
const LONG = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Nov 2, 2026"; the short form ("Nov 2") keeps the year when it isn't the year of `today`. */
export function formatDueDate(date: CalendarDate, style: "long" | "short" = "long", today = todayUtc()): string {
  const useShort = style === "short" && date.slice(0, 4) === today.slice(0, 4);
  return (useShort ? SHORT : LONG).format(new Date(`${date}T00:00:00Z`));
}
