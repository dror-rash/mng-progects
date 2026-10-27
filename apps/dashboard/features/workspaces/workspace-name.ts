import { cleanText } from "@/features/forms/clean-text";

const MAX_LENGTH = 100;

export function parseWorkspaceName(value: FormDataEntryValue | null): { ok: true; value: string } | { ok: false; error: string } {
  const name = cleanText(value);
  if (!name) return { ok: false, error: "Workspace name is required" };
  if (name.length > MAX_LENGTH) return { ok: false, error: `Keep the name under ${MAX_LENGTH} characters` };
  return { ok: true, value: name };
}
