"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { joinWorkspaceAction } from "./actions";

/** The token isn't in the form: the action reads it from the invite cookie. */
export function JoinForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(joinWorkspaceAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" disabled={pending}>Join workspace</Button>
      <FieldError message={state.error} />
    </form>
  );
}
