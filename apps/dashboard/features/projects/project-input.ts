export type ProjectInput = { name: string; description: string | null };

export function parseProjectInput(
  formData: FormData,
): { ok: true; value: ProjectInput } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Project name is required" };
  }
  return { ok: true, value: { name, description: description || null } };
}
