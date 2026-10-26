/** What a form's server action returns: an error to show, which field it belongs to, and the values to put back. */
export type FormState = { error?: string; field?: string; values?: Record<string, string> };

export function invalid(error: string, formData: FormData, field?: string): FormState {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    // Next adds its own "$ACTION_…" fields to every server-action submission.
    if (typeof value === "string" && !key.startsWith("$ACTION_")) values[key] = value;
  }
  return field ? { error, field, values } : { error, values };
}
