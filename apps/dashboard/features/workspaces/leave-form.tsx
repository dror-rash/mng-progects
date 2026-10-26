"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { leaveWorkspaceAction } from "./actions";

export function LeaveForm() {
  const [state, formAction, pending] = useActionState<FormState>(leaveWorkspaceAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>Leave workspace</Button>
      <FieldError message={state.error} />
    </form>
  );
}
