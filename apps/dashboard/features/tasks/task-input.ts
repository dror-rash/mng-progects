import { cleanText } from "@/features/forms/clean-text";

import { type CalendarDate, parseDueDate } from "./due-dates";
import { parseTaskPriority, type TaskPriority } from "./task-priority";

/**
 * `organizationId`: the chosen customer, `null` for none, or `undefined` when the form has no customer
 * field (the board's quick add), meaning "leave it / use the project's". Callers check ownership.
 */
export type TaskInput = {
  title: string;
  description: string | null;
  organizationId: string | null | undefined;
  /** `undefined` when the form has no priority field (quick add): keep the current one / the default. */
  priority: TaskPriority | undefined;
  /** `null` clears it; `undefined` when the form has no due-date field (quick add). */
  dueDate: CalendarDate | null | undefined;
};

export function parseTaskInput(
  formData: FormData,
): { ok: true; value: TaskInput } | { ok: false; error: string; field: "title" | "priority" | "dueDate" } {
  const title = cleanText(formData.get("title"));
  const description = cleanText(formData.get("description"));
  if (!title) {
    return { ok: false, field: "title", error: "Task title is required" };
  }
  const customerId = formData.get("customerId");
  const organizationId = customerId === null ? undefined : String(customerId).trim() || null;
  const rawPriority = formData.get("priority");
  const priority = rawPriority === null ? undefined : parseTaskPriority(String(rawPriority).trim());
  if (priority === null) {
    return { ok: false, field: "priority", error: "Choose a priority" };
  }
  const dueDate = parseDueDate(formData.get("dueDate"));
  if (!dueDate.ok) {
    return { ok: false, field: "dueDate", error: "Enter a valid date" };
  }
  return { ok: true, value: { title, description: description || null, organizationId, priority, dueDate: dueDate.value } };
}
