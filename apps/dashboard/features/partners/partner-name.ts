import { cleanText } from "@/features/forms/clean-text";

/** Longest partner name; the input uses it as `maxLength`, the server enforces it. */
export const PARTNER_NAME_MAX_LENGTH = 100;

export function parsePartnerName(
  value: FormDataEntryValue | null,
): { ok: true; name: string } | { ok: false; field: "name"; error: string } {
  const name = cleanText(value);
  if (!name) return { ok: false, field: "name", error: "Enter a name" };
  if (name.length > PARTNER_NAME_MAX_LENGTH) {
    return { ok: false, field: "name", error: `Use at most ${PARTNER_NAME_MAX_LENGTH} characters` };
  }
  return { ok: true, name };
}
