export type TaskInput = { title: string; description: string | null };

export function parseTaskInput(formData: FormData): { ok: true; value: TaskInput } | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) {
    return { ok: false, error: "Task title is required" };
  }
  return { ok: true, value: { title, description: description || null } };
}
