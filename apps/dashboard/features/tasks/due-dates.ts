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

/** Form value → date, `null` when cleared, `undefined` when the form has no such field, or "invalid". */
export function parseDueDate(value: FormDataEntryValue | null): CalendarDate | null | undefined | "invalid" {
  if (value === null) return undefined;
  const text = String(value).trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "invalid";
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text ? text : "invalid";
}

const LONG = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function formatDueDate(date: CalendarDate, style: "long" | "short" = "long"): string {
  return (style === "long" ? LONG : SHORT).format(new Date(`${date}T00:00:00Z`));
}
