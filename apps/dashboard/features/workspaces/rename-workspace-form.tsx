"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { renameWorkspaceAction } from "./settings-actions";
import { WORKSPACE_NAME_MAX_LENGTH } from "./workspace-name";

export function RenameWorkspaceForm({ workspaceId, name }: { workspaceId: string; name: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(renameWorkspaceAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <label htmlFor="workspace-name" className="text-sm font-medium">Workspace name</label>
      <div className="flex flex-wrap items-start gap-2">
        <Input
          id="workspace-name"
          name="name"
          className="sm:max-w-sm"
          defaultValue={state.values?.name ?? name}
          maxLength={WORKSPACE_NAME_MAX_LENGTH}
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "workspace-name-error" : undefined}
        />
        <Button type="submit" disabled={pending}>Rename workspace</Button>
      </div>
      <FieldError id="workspace-name-error" message={state.error} />
    </form>
  );
}
