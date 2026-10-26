import { cleanText } from "@/features/forms/clean-text";

type Result = { ok: true; value: { body: string } } | { ok: false; field: string; error: string };

export function parseNoteInput(formData: FormData): Result {
  const body = cleanText(formData.get("body"));
  if (!body) return { ok: false, field: "body", error: "Write something before adding the note" };
  return { ok: true, value: { body } };
}
