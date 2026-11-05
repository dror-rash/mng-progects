/**
 * A reading form's status (task 060), in lifecycle order: Draft → Published → Archived, never back. The
 * database's `form_template_status_check` lists the same values and its trigger keeps them moving forward.
 */
export const FORM_STATUSES = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "archived", label: "Archived" },
] as const;

export type FormStatus = (typeof FORM_STATUSES)[number]["status"];

/** An unknown stored status reads as Archived: nothing offers to change it. */
const UNKNOWN_STATUS: FormStatus = "archived";

export function parseFormStatus(value: unknown): FormStatus | null {
  return FORM_STATUSES.find((s) => s.status === value)?.status ?? null;
}

/** A stored status, or Archived for one the app doesn't know. */
export function formStatusOf(value: string): FormStatus {
  return parseFormStatus(value) ?? UNKNOWN_STATUS;
}

export function formStatusLabel(status: FormStatus): string {
  return FORM_STATUSES.find((s) => s.status === status)!.label;
}
