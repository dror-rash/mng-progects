"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createTaskAction } from "./actions";

export function AddTaskForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createTaskAction, {});

  return (
    <form action={formAction} className="max-w-xl space-y-1">
      <input type="hidden" name="projectId" value={projectId} />
      <label htmlFor="title" className="text-sm font-medium">Task title</label>
      <div className="flex items-start gap-2">
        <Input
          id="title"
          name="title"
          placeholder="e.g. Write homepage copy"
          defaultValue={state.values?.title ?? ""}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "title-error" : undefined}
          required
        />
        <Button type="submit" disabled={pending}>Add task</Button>
      </div>
      <FieldError id="title-error" message={state.error} />
    </form>
  );
}
