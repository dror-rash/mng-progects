"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { NativeSelect } from "@repo/ui/native-select";
import { Textarea } from "@repo/ui/textarea";
import { type FormEvent, startTransition, useActionState, useEffect, useRef } from "react";

import type { FormState } from "@/features/forms/form-state";
import { clearUnchanged, type FieldSnapshot, snapshotFields } from "@/features/forms/keep-new-input";

import { MAX } from "./field-input";
import { DEFAULT_FIELD_TYPE, FIELD_TYPES } from "./field-type";
import type { FormAction } from "./form-action-button";

/**
 * Adds a field to a draft reading form (task 060). The unit is kept on number fields and the options on
 * choice fields only (`parseFieldInput`). No `required` attributes: the server's messages show inline.
 *
 * The form stays for the next field, so it submits from `onSubmit` rather than letting React reset it: after a
 * field is added only what was sent is cleared, and whatever was typed meanwhile stays (`keep-new-input.ts`).
 * A refused field keeps everything as typed. Without JavaScript, `action` still posts the form.
 */
export function AddFieldForm({ action, workspaceId, formId }: { action: FormAction; workspaceId: string; formId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const sent = useRef<FieldSnapshot | null>(null);

  useEffect(() => {
    if (!sent.current || state.error || !formRef.current) return;
    clearUnchanged(formRef.current, sent.current);
    sent.current = null;
  }, [state]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    sent.current = snapshotFields(form);
    const data = new FormData(form);
    startTransition(() => formAction(data));
  }

  const errorFor = (field: string) => (state.field === field ? state.error : undefined);
  const fieldProps = (field: string, hint?: string) => {
    const describedBy = [state.field === field ? `field-${field}-error` : null, hint].filter(Boolean).join(" ");
    return { ...(state.field === field ? { "aria-invalid": true } : {}), ...(describedBy ? { "aria-describedby": describedBy } : {}) };
  };

  return (
    <form ref={formRef} action={formAction} onSubmit={submit} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="formId" value={formId} />
      <FieldError message={state.field ? undefined : state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="field-label" className="text-sm font-medium">Label</label>
          <Input id="field-label" name="label" maxLength={MAX.label} {...fieldProps("label")} />
          <FieldError id="field-label-error" message={errorFor("label")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="field-type" className="text-sm font-medium">Type</label>
          {/* No key or values from the state: this form isn't reset by React (see above), so the select keeps its choice. */}
          <NativeSelect id="field-type" name="type" defaultValue={DEFAULT_FIELD_TYPE} {...fieldProps("type")}>
            {FIELD_TYPES.map((t) => (
              <option key={t.type} value={t.type}>{t.label}</option>
            ))}
          </NativeSelect>
          <FieldError id="field-type-error" message={errorFor("type")} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="field-unit" className="text-sm font-medium">Unit</label>
        <Input id="field-unit" name="unit" maxLength={MAX.unit} placeholder="e.g. V" {...fieldProps("unit", "field-unit-hint")} />
        <p id="field-unit-hint" className="text-xs text-muted-foreground">Number fields only.</p>
        <FieldError id="field-unit-error" message={errorFor("unit")} />
      </div>
      <div className="space-y-1">
        <label htmlFor="field-options" className="text-sm font-medium">Options</label>
        <Textarea id="field-options" name="options" rows={3} {...fieldProps("options", "field-options-hint")} />
        <p id="field-options-hint" className="text-xs text-muted-foreground">Choice fields only: one option per line, at least two.</p>
        <FieldError id="field-options-error" message={errorFor("options")} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <input type="checkbox" id="field-required" name="required" />
        <label htmlFor="field-required">Required</label>
      </div>
      <Button type="submit" disabled={pending}>Add field</Button>
    </form>
  );
}
