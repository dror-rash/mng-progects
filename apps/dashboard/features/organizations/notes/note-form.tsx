"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Textarea } from "@repo/ui/textarea";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { addNoteAction } from "./actions";

export function NoteForm({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addNoteAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="customerId" value={customerId} />
      <label htmlFor="note-body" className="text-sm font-medium">Note</label>
      <Textarea
        id="note-body"
        name="body"
        rows={3}
        placeholder="e.g. Kick-off call went well; they want a quote for phase 2."
        defaultValue={state.values?.body ?? ""}
        required
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "note-body-error" : undefined}
      />
      <FieldError id="note-body-error" message={state.error} />
      <Button type="submit" size="sm" disabled={pending}>Add note</Button>
    </form>
  );
}
