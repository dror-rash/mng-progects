"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createPartnerAction } from "./actions";
import { PARTNER_NAME_MAX_LENGTH } from "./partner-name";

/** Creates a partner company in `workspaceId` (the workspace this page shows). */
export function PartnerForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createPartnerAction, {});
  const nameError = state.field === "name" ? state.error : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FieldError message={state.field ? undefined : state.error} />
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <Input
          id="name"
          name="name"
          required
          maxLength={PARTNER_NAME_MAX_LENGTH}
          defaultValue={state.values?.name ?? ""}
          {...(nameError ? { "aria-invalid": true, "aria-describedby": "name-error" } : {})}
        />
        <FieldError id="name-error" message={nameError} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Create partner</Button>
        <Button asChild variant="ghost">
          <Link href="/partners">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
