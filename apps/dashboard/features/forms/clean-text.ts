// Control characters other than tab and newlines; Postgres rejects NUL outright.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Form text, trimmed and without control characters. */
export function cleanText(value: FormDataEntryValue | null): string {
  return String(value ?? "").replace(CONTROL_CHARS, "").trim();
}
