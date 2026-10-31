"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { NativeSelect } from "@repo/ui/native-select";
import { Textarea } from "@repo/ui/textarea";
import { useActionState, useState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { MAX_DUE_DATE, MIN_DUE_DATE } from "./due-dates";
import { normalizeTaskPriority, parseTaskPriority, TASK_PRIORITIES } from "./task-priority";

import { updateTaskAction } from "./actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  organizationId: string | null;
  /** The task has a customer the user can't see (rule 7a); `organizationId` is then null, never its id. */
  customerHidden?: boolean;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
};
type MemberOption = { userId: string; name: string };
type CustomerOption = { id: string; name: string };

export function EditTaskForm({
  projectId,
  task,
  customers,
  members,
}: {
  projectId: string;
  task: Task;
  customers: CustomerOption[];
  members: MemberOption[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateTaskAction, {});
  // Errors without a field are about the title, the only other required input.
  const titleError = state.field === "title" ? state.error : undefined;
  // Errors that belong to no field (e.g. "This task no longer exists") show above the form.
  const formError = state.field ? undefined : state.error;
  const customerError = state.field === "customerId" ? state.error : undefined;
  const priorityError = state.field === "priority" ? state.error : undefined;
  const dueDateError = state.field === "dueDate" ? state.error : undefined;
  const assigneeError = state.field === "assigneeId" ? state.error : undefined;
  const assigneeValue = state.values?.assigneeId ?? task.assigneeId ?? "";
  // A submitted value is restored only if it is a real option, so the select never shows an unrelated one.
  const priority = parseTaskPriority(state.values?.priority) ?? normalizeTaskPriority(task.priority);
  // A customer that isn't one of my choices (a partner can't see it, rule 7a) shows as "No customer". Until
  // I choose another, the form doesn't post the field, so the server keeps it rather than clearing it.
  const customerHidden =
    task.customerHidden === true || (task.organizationId !== null && !customers.some((c) => c.id === task.organizationId));
  const [customerChosen, setCustomerChosen] = useState(false);
  const customerValue = state.values?.customerId ?? (customerHidden ? "" : (task.organizationId ?? ""));

  return (
    <form action={formAction} className="space-y-4">
      <FieldError message={formError} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="taskId" value={task.id} />
      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">Title</label>
        <Input
          id="title"
          name="title"
          defaultValue={state.values?.title ?? task.title}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "title-error" : undefined}
          required
        />
        <FieldError id="title-error" message={titleError} />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <Textarea id="description" name="description" defaultValue={state.values?.description ?? task.description ?? ""} rows={5} />
      </div>
      <div className="space-y-1">
        <label htmlFor="priority" className="text-sm font-medium">Priority</label>
        {/* Keyed on the value: a select only applies defaultValue when it mounts. */}
        <NativeSelect
          key={priority}
          id="priority"
          name="priority"
          defaultValue={priority}
          aria-invalid={priorityError ? true : undefined}
          aria-describedby={priorityError ? "priority-error" : undefined}
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p.priority} value={p.priority}>{p.label}</option>
          ))}
        </NativeSelect>
        <FieldError id="priority-error" message={priorityError} />
      </div>
      <div className="space-y-1">
        <label htmlFor="dueDate" className="text-sm font-medium">Due date</label>
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          min={MIN_DUE_DATE}
          max={MAX_DUE_DATE}
          className="w-auto"
          defaultValue={state.values?.dueDate ?? task.dueDate ?? ""}
          aria-invalid={dueDateError ? true : undefined}
          aria-describedby={dueDateError ? "dueDate-error" : undefined}
        />
        <FieldError id="dueDate-error" message={dueDateError} />
      </div>
      <div className="space-y-1">
        <label htmlFor="assigneeId" className="text-sm font-medium">Assignee</label>
        {/* Keyed on the value: a select only applies defaultValue when it mounts. */}
        <NativeSelect
          key={assigneeValue}
          id="assigneeId"
          name="assigneeId"
          defaultValue={assigneeValue}
          aria-invalid={assigneeError ? true : undefined}
          aria-describedby={assigneeError ? "assigneeId-error" : undefined}
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>{m.name}</option>
          ))}
        </NativeSelect>
        <FieldError id="assigneeId-error" message={assigneeError} />
      </div>
      <div className="space-y-1">
        <label htmlFor="customerId" className="text-sm font-medium">Customer</label>
        {/* A select only applies defaultValue when it mounts, and React resets the form after every
            submit; keying on the value just submitted keeps the user's choice after an error. */}
        <NativeSelect
          key={customerValue}
          id="customerId"
          name={customerHidden && !customerChosen ? undefined : "customerId"}
          defaultValue={customerValue}
          onChange={() => setCustomerChosen(true)}
          aria-invalid={customerError ? true : undefined}
          aria-describedby={customerError ? "customerId-error" : undefined}
        >
          <option value="">No customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
        <FieldError id="customerId-error" message={customerError} />
      </div>
      <Button type="submit" disabled={pending}>Save changes</Button>
    </form>
  );
}
