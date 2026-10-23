/**
 * `organizationId`: the chosen customer, `null` for none, or `undefined` when the form has no customer
 * field (the board's quick add), meaning "leave it / use the project's". Callers check ownership.
 */
export type TaskInput = { title: string; description: string | null; organizationId: string | null | undefined };

export function parseTaskInput(formData: FormData): { ok: true; value: TaskInput } | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) {
    return { ok: false, error: "Task title is required" };
  }
  const customerId = formData.get("customerId");
  const organizationId = customerId === null ? undefined : String(customerId).trim() || null;
  return { ok: true, value: { title, description: description || null, organizationId } };
}
