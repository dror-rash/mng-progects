import { noteName } from "@/features/deleted/note-name";
import { type CalendarDate, formatDueDate } from "@/features/tasks/due-dates";

/** How a visit is named in lists (task 058): its notes' first line, or "Visit on <date>" without notes. */
export function visitName(notes: string | null, visitedOn: CalendarDate): string {
  return notes?.trim() ? noteName(notes) : `Visit on ${formatDueDate(visitedOn)}`;
}
