import { cleanText } from "@/features/forms/clean-text";

import { isValidEmail } from "../organization-input";

export type ContactInput = { name: string; role: string | null; phone: string | null; email: string | null };

type Result = { ok: true; value: ContactInput } | { ok: false; field: string; error: string };

export function parseContactInput(formData: FormData): Result {
  const text = (field: string) => cleanText(formData.get(field));
  const optional = (field: string) => text(field) || null;

  const name = text("name");
  if (!name) return { ok: false, field: "name", error: "Contact name is required" };

  const email = optional("email");
  if (email && !isValidEmail(email)) return { ok: false, field: "email", error: "Enter a valid email address" };

  return { ok: true, value: { name, role: optional("role"), phone: optional("phone"), email } };
}
