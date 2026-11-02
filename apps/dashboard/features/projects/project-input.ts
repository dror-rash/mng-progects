import { cleanText } from "@/features/forms/clean-text";

/**
 * `organizationId` is the chosen customer and `siteId` one of its sites (task 055); null when left empty.
 * The actions require both, after checking the customer (`checkCustomerAndSite`).
 */
export type ProjectInput = { name: string; description: string | null; organizationId: string | null; siteId: string | null };

export function parseProjectInput(
  formData: FormData,
): { ok: true; value: ProjectInput } | { ok: false; error: string } {
  const name = cleanText(formData.get("name"));
  const description = cleanText(formData.get("description"));
  if (!name) {
    return { ok: false, error: "Project name is required" };
  }
  const organizationId = String(formData.get("customerId") ?? "").trim() || null;
  const siteId = String(formData.get("siteId") ?? "").trim() || null;
  return { ok: true, value: { name, description: description || null, organizationId, siteId } };
}
