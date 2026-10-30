"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { makePrimaryContactAction } from "./actions";

export function MakePrimaryForm({ customerId, contact }: { customerId: string; contact: { id: string; name: string } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(makePrimaryContactAction, {});

  return (
    <form action={formAction} className="flex flex-col items-end">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="contactId" value={contact.id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Make<span className="sr-only"> {contact.name}</span> primary
      </Button>
      <FieldError message={state.error} />
    </form>
  );
}
