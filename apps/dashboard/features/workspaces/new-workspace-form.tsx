"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createWorkspaceAction } from "./actions";

export function NewWorkspaceForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createWorkspaceAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="workspace-name" className="text-sm font-medium">Workspace name</label>
      <div className="flex items-start gap-2">
        <Input
          id="workspace-name"
          name="name"
          placeholder="e.g. Acme Team"
          defaultValue={state.values?.name ?? ""}
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "workspace-name-error" : undefined}
        />
        <Button type="submit" disabled={pending}>Create workspace</Button>
      </div>
      <FieldError id="workspace-name-error" message={state.error} />
    </form>
  );
}
