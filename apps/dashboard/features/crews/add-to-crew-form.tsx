"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { NativeSelect } from "@repo/ui/native-select";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { addCrewMemberAction } from "./actions";

/** The admin's form to put one of the workspace's workers on a project's crew (task 056). */
export function AddToCrewForm({ projectId, workers }: { projectId: string; workers: { userId: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addCrewMemberAction, {});
  if (workers.length === 0) {
    return <p className="text-muted-foreground">Every worker of this workspace is on the crew, or there are none yet. Invite workers from the members page.</p>;
  }
  const chosen = state.values?.userId ?? workers[0]!.userId;
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-1">
        <label htmlFor="crew-userId" className="text-sm font-medium">Worker to add</label>
        {/* Keyed on the value: a select only applies defaultValue when it mounts. */}
        <NativeSelect
          key={chosen}
          id="crew-userId"
          name="userId"
          defaultValue={chosen}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "crew-userId-error" : undefined}
        >
          {workers.map((w) => (
            <option key={w.userId} value={w.userId}>{w.name}</option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>Add to crew</Button>
      <FieldError id="crew-userId-error" message={state.error} />
    </form>
  );
}
