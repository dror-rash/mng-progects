import { cleanText } from "@/features/forms/clean-text";
import { parseFieldType } from "@/features/reading-forms/field-type";
import { formatDueDate, parseDueDate } from "@/features/tasks/due-dates";

// A reading's values (task 061, ADR-0008): checked here against the fields of the form version it is filled
// against, and stored as `jsonb` keyed by field id: a number, text, true/false (Yes/no), one of the options
// (Choice) or a "YYYY-MM-DD" day (Date). An optional field left empty isn't stored.

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

/** A Yes/no field's two answers: as posted, as shown, and as stored. */
export const YES_NO = [
  { value: "yes", label: "Yes", stored: true },
  { value: "no", label: "No", stored: false },
] as const;

export const MAX_TEXT = 5000;

const NOT_FILLED_IN = "Not filled in";

/** A plain decimal number (no hex, no "Infinity"), as a number input sends it. */
const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/** The name of a field's input on the reading form. */
export function fieldInputName(fieldId: string): string {
  return `field-${fieldId}`;
}

type Invalid = { ok: false; field: string; error: string };

/** One field's posted value: its stored value, `null` when left empty, or the error to show on it. */
function parseValue(field: ReadingField, raw: FormDataEntryValue | null): { value: number | string | boolean | null } | { error: string } {
  const text = cleanText(raw);
  if (!text) return { value: null };
  switch (parseFieldType(field.type)) {
    case "number": {
      const n = Number(text);
      return NUMBER.test(text) && Number.isFinite(n) ? { value: n } : { error: `${field.label} must be a number` };
    }
    case "yes_no": {
      const answer = YES_NO.find((option) => option.value === text);
      return answer ? { value: answer.stored } : { error: `Choose Yes or No for ${field.label}` };
    }
    case "choice":
      return field.options?.includes(text) ? { value: text } : { error: `Choose ${field.label} from the list` };
    case "date": {
      const day = parseDueDate(text);
      return day.ok && day.value ? { value: day.value } : { error: `${field.label} must be a date` };
    }
    default:
      return text.length > MAX_TEXT ? { error: `Keep ${field.label} under ${MAX_TEXT} characters` } : { value: text };
  }
}

/**
 * The reading form's values for `fields`, in their order; the first error is on its field's input. Posted
 * values for other fields are ignored.
 */
export function parseReadingValues(formData: FormData, fields: ReadingField[]): { ok: true; value: ReadingValues } | Invalid {
  const values: ReadingValues = {};
  for (const field of fields) {
    const name = fieldInputName(field.id);
    const parsed = parseValue(field, formData.get(name));
    if ("error" in parsed) return { ok: false, field: name, error: parsed.error };
    if (parsed.value === null) {
      if (field.required) return { ok: false, field: name, error: `${field.label} is required` };
      continue;
    }
    values[field.id] = parsed.value;
  }
  return { ok: true, value: values };
}

/** Whether a stored value counts as filled in (`readingValueText` shows the rest as "Not filled in"). */
export function isFilledIn(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

/** How a stored value shows on a reading: "230 V", "Yes", "Nov 2, 2026", or "Not filled in". */
export function readingValueText(field: ReadingField, value: unknown): string {
  if (!isFilledIn(value)) return NOT_FILLED_IN;
  const type = parseFieldType(field.type);
  if (type === "number" && typeof value === "number") return field.unit ? `${value} ${field.unit}` : String(value);
  if (type === "yes_no" && typeof value === "boolean") return YES_NO.find((option) => option.stored === value)!.label;
  if (type === "date" && typeof value === "string") {
    const day = parseDueDate(value);
    if (day.ok && day.value) return formatDueDate(day.value);
  }
  return String(value);
}
