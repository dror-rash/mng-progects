"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { updateTaskAction } from "./actions";

type Task = { id: string; title: string; description: string | null };

export function EditTaskForm({ projectId, task }: { projectId: string; task: Task }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateTaskAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="taskId" value={task.id} />
      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">Title</label>
        <Input
          id="title"
          name="title"
          defaultValue={state.values?.title ?? task.title}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "title-error" : undefined}
          required
        />
        <FieldError id="title-error" message={state.error} />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <Textarea id="description" name="description" defaultValue={state.values?.description ?? task.description ?? ""} rows={5} />
      </div>
      <Button type="submit" disabled={pending}>Save changes</Button>
    </form>
  );
}
