import { cleanText } from "@/features/forms/clean-text";

import { type FieldType, parseFieldType } from "./field-type";

type Invalid = { ok: false; field: string; error: string };

export type FormInput = { name: string; description: string | null };

export type FieldInput = {
  label: string;
  type: FieldType;
  required: boolean;
  /** Number fields only. */
  unit: string | null;
  /** Choice fields only: two or more, in the order given. */
  options: string[] | null;
};

export const MAX = { name: 200, description: 2000, label: 200, unit: 50, option: 200, options: 50 };

/** The new-form form: a name (required) and a description. */
export function parseFormInput(formData: FormData): { ok: true; value: FormInput } | Invalid {
  const name = cleanText(formData.get("name"));
  if (!name) return { ok: false, field: "name", error: "Form name is required" };
  if (name.length > MAX.name) return { ok: false, field: "name", error: `Keep the name under ${MAX.name} characters` };
  const description = cleanText(formData.get("description"));
  if (description.length > MAX.description) {
    return { ok: false, field: "description", error: `Keep the description under ${MAX.description} characters` };
  }
  return { ok: true, value: { name, description: description || null } };
}

/** A choice's options: one per line, trimmed, without blank lines or repeats. */
function optionLines(value: FormDataEntryValue | null): string[] {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);
  return [...new Set(lines)];
}

const TWO_OPTIONS = "Add at least two options, one per line";

/**
 * The add-field form: a label, a type, Required, a unit (kept only on number fields) and options (only on
 * choice fields, at least two).
 */
export function parseFieldInput(formData: FormData): { ok: true; value: FieldInput } | Invalid {
  const label = cleanText(formData.get("label"));
  if (!label) return { ok: false, field: "label", error: "Field label is required" };
  if (label.length > MAX.label) return { ok: false, field: "label", error: `Keep the label under ${MAX.label} characters` };
  const type = parseFieldType(formData.get("type"));
  if (!type) return { ok: false, field: "type", error: "Choose a field type" };

  let unit: string | null = null;
  if (type === "number") {
    unit = cleanText(formData.get("unit")) || null;
    if (unit && unit.length > MAX.unit) return { ok: false, field: "unit", error: `Keep the unit under ${MAX.unit} characters` };
  }

  let options: string[] | null = null;
  if (type === "choice") {
    options = optionLines(formData.get("options"));
    if (options.length < 2) return { ok: false, field: "options", error: TWO_OPTIONS };
    if (options.length > MAX.options) return { ok: false, field: "options", error: `Keep it to ${MAX.options} options` };
    if (options.some((option) => option.length > MAX.option)) {
      return { ok: false, field: "options", error: `Keep each option under ${MAX.option} characters` };
    }
  }

  return { ok: true, value: { label, type, required: formData.get("required") === "on", unit, options } };
}
