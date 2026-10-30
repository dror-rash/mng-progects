"use client";

import { ConfirmByName } from "@repo/ui/confirm-by-name";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { deleteWorkspaceAction } from "./settings-actions";

export function DeleteWorkspaceForm({ workspaceId, name }: { workspaceId: string; name: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(deleteWorkspaceAction, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <ConfirmByName name={name} action="Delete workspace" error={state.error} pending={pending} id="delete-workspace-name" />
    </form>
  );
}
