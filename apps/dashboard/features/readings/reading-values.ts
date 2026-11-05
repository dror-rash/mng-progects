/** A field of the form version a reading is filled against (task 060's `form_field`). */
export type ReadingField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  unit: string | null;
  options: string[] | null;
};

/** A reading's stored values (`form_submission.values`), keyed by field id. */
export type ReadingValues = Record<string, number | string | boolean>;

export function fieldInputName(fieldId: string): string {
  return `field-${fieldId}`;
}

export function parseReadingValues(
  _formData: FormData,
  _fields: ReadingField[],
): { ok: true; value: ReadingValues } | { ok: false; field: string; error: string } {
  throw new Error("Not implemented");
}

export function readingValueText(_field: ReadingField, _value: unknown): string {
  throw new Error("Not implemented");
}
