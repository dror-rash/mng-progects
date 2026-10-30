import { cleanText } from "@/features/forms/clean-text";

/** `organizationId` is the chosen customer; callers check it is in the project's workspace. */
export type ProjectInput = { name: string; description: string | null; organizationId: string | null };

export function parseProjectInput(
  formData: FormData,
): { ok: true; value: ProjectInput } | { ok: false; error: string } {
  const name = cleanText(formData.get("name"));
  const description = cleanText(formData.get("description"));
  if (!name) {
    return { ok: false, error: "Project name is required" };
  }
  const organizationId = String(formData.get("customerId") ?? "").trim() || null;
  return { ok: true, value: { name, description: description || null, organizationId } };
}
