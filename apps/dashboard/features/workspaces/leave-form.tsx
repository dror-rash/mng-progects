"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { leaveWorkspaceAction } from "./actions";

export function LeaveForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(leaveWorkspaceAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>Leave workspace</Button>
      <FieldError message={state.error} />
    </form>
  );
}
