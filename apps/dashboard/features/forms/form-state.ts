/** What a form's server action returns: an error to show, and the values to put back in the fields. */
export type FormState = { error?: string; values?: Record<string, string> };

export function invalid(error: string, formData: FormData): FormState {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string") values[key] = value;
  }
  return { error, values };
}
