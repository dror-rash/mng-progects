/** `organizationId` is the chosen customer; callers check the user owns it. */
export type ProjectInput = { name: string; description: string | null; organizationId: string | null };

export function parseProjectInput(
  formData: FormData,
): { ok: true; value: ProjectInput } | { ok: false; error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) {
    return { ok: false, error: "Project name is required" };
  }
  const organizationId = String(formData.get("customerId") ?? "").trim() || null;
  return { ok: true, value: { name, description: description || null, organizationId } };
}
