/**
 * The types of a reading form's field (task 060; Photo comes after the POC). The database's
 * `form_field_type_check` lists the same values.
 */
export const FIELD_TYPES = [
  { type: "number", label: "Number" },
  { type: "text", label: "Text" },
  { type: "yes_no", label: "Yes/no" },
  { type: "choice", label: "Choice" },
  { type: "date", label: "Date" },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["type"];

/** What the add-field form offers first. */
export const DEFAULT_FIELD_TYPE: FieldType = "number";

/** How a stored type the app doesn't know shows. */
const UNKNOWN_FIELD_TYPE: FieldType = "text";

export function parseFieldType(value: unknown): FieldType | null {
  return FIELD_TYPES.find((t) => t.type === value)?.type ?? null;
}

export function fieldTypeLabel(value: string): string {
  const type = parseFieldType(value) ?? UNKNOWN_FIELD_TYPE;
  return FIELD_TYPES.find((t) => t.type === type)!.label;
}
