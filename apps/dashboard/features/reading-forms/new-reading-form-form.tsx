"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createReadingFormAction } from "./actions";
import { MAX } from "./field-input";

/** Creates a draft reading form in `workspaceId` (the workspace this page shows); fields come on its page. */
export function NewReadingFormForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createReadingFormAction, {});
  const errorFor = (field: string) => (state.field === field ? state.error : undefined);
  const fieldProps = (field: string) =>
    state.field === field ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FieldError message={state.field ? undefined : state.error} />
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <Input id="name" name="name" maxLength={MAX.name} placeholder="e.g. Panel check" defaultValue={state.values?.name ?? ""} {...fieldProps("name")} />
        <FieldError id="name-error" message={errorFor("name")} />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <Textarea id="description" name="description" rows={3} maxLength={MAX.description} defaultValue={state.values?.description ?? ""} {...fieldProps("description")} />
        <FieldError id="description-error" message={errorFor("description")} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Create form</Button>
        <Button asChild variant="ghost">
          <Link href="/forms">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
