import { cleanText } from "@/features/forms/clean-text";

/** Longest workspace name; inputs use it as `maxLength`, the server enforces it. */
export const WORKSPACE_NAME_MAX_LENGTH = 100;

export function parseWorkspaceName(value: FormDataEntryValue | null): { ok: true; value: string } | { ok: false; error: string } {
  const name = cleanText(value);
  if (!name) return { ok: false, error: "Workspace name is required" };
  if (name.length > WORKSPACE_NAME_MAX_LENGTH) {
    return { ok: false, error: `Workspace name must be ${WORKSPACE_NAME_MAX_LENGTH} characters or fewer` };
  }
  return { ok: true, value: name };
}

/** Deleting a workspace needs its exact name typed (case-sensitive; surrounding spaces don't count). */
export function confirmsWorkspaceName(typed: FormDataEntryValue | null, name: string): boolean {
  return typeof typed === "string" && typed.trim() === name;
}
