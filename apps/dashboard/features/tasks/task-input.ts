import { cleanText } from "@/features/forms/clean-text";

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
};

export function parseTaskInput(
  formData: FormData,
): { ok: true; value: TaskInput } | { ok: false; error: string; field?: string } {
  const title = cleanText(formData.get("title"));
  const description = cleanText(formData.get("description"));
  if (!title) {
    return { ok: false, error: "Task title is required" };
  }
  const customerId = formData.get("customerId");
  const organizationId = customerId === null ? undefined : String(customerId).trim() || null;
  const rawPriority = formData.get("priority");
  const priority = rawPriority === null ? undefined : parseTaskPriority(String(rawPriority));
  if (priority === null) {
    return { ok: false, field: "priority", error: "Choose a priority" };
  }
  return { ok: true, value: { title, description: description || null, organizationId, priority } };
}
