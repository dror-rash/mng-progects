"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { NativeSelect } from "@repo/ui/native-select";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { FormState } from "@/features/forms/form-state";
import { parseFieldType } from "@/features/reading-forms/field-type";

import { fieldInputName, type ReadingField, YES_NO } from "./reading-values";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Fill in a reading (task 061): one input per field of the form version, in order. Number → a number input with
 * its unit, Text → a text box, Yes/no → Yes and No radios, Choice → a select, Date → a date input. The reading's
 * id is made here, once per form, so sending it again records one reading. The page passes the action, so this
 * stays free of server code. No `required` attributes: the server checks and shows the error on the field.
 */
export function ReadingForm({
  action,
  projectId,
  visitId,
  versionId,
  fields,
  cancelHref,
}: {
  action: Action;
  projectId: string;
  visitId: string;
  versionId: string;
  fields: ReadingField[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [readingId] = useState(() => crypto.randomUUID());

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="readingId" value={readingId} />
      {fields.map((field) => (
        <ReadingInput key={field.id} field={field} state={state} />
      ))}
      {state.error && !state.field && <FieldError id="reading-error" message={state.error} />}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Save reading</Button>
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

/** One field's input, its "Required" note and its error. Inputs are keyed on their value: React resets the form after each submit. */
function ReadingInput({ field, state }: { field: ReadingField; state: FormState }) {
  const name = fieldInputName(field.id);
  const id = `reading-${field.id}`;
  const error = state.field === name ? state.error : undefined;
  const value = state.values?.[name] ?? "";
  const errorId = `${id}-error`;
  const describedBy = [field.required ? `${id}-required` : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const invalid = error ? true : undefined;
  const required = field.required ? (
    <span id={`${id}-required`} className="text-xs text-muted-foreground">Required</span>
  ) : null;

  if (parseFieldType(field.type) === "yes_no") {
    return (
      <fieldset className="space-y-2" aria-describedby={describedBy} aria-invalid={invalid}>
        <legend className="text-sm font-medium">{field.label}</legend>
        <div key={value} className="flex gap-6">
          {YES_NO.map((option) => (
            <div key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                id={`${id}-${option.value}`}
                name={name}
                value={option.value}
                defaultChecked={value === option.value}
                className="size-4"
              />
              <label htmlFor={`${id}-${option.value}`}>{option.label}</label>
            </div>
          ))}
        </div>
        {required}
        <FieldError id={errorId} message={error} />
      </fieldset>
    );
  }

  const common = { id, name, defaultValue: value, "aria-invalid": invalid, "aria-describedby": describedBy };
  let input;
  switch (parseFieldType(field.type)) {
    case "number":
      input = (
        <div className="flex items-center gap-2">
          <Input key={value} type="number" step="any" inputMode="decimal" {...common} />
          {field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
        </div>
      );
      break;
    case "choice":
      input = (
        <NativeSelect key={value} {...common}>
          <option value="">Not filled in</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </NativeSelect>
      );
      break;
    case "date":
      input = <Input key={value} type="date" {...common} />;
      break;
    default:
      input = <Input key={value} type="text" {...common} />;
  }
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{field.label}</label>
      {input}
      {required}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
