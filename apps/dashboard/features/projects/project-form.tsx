"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { NativeSelect } from "@repo/ui/native-select";
import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createProjectAction, updateProjectAction } from "./actions";

type Project = { id: string; name: string; description: string | null; organizationId: string | null };
type CustomerOption = { id: string; name: string };

/** Create a project, or edit one when `project` is given. Shows validation errors and keeps what was typed or chosen. */
export function ProjectForm({
  project,
  workspaceId,
  customers,
}: {
  project?: Project;
  /** For a new project: the workspace it goes in (the one this page shows). */
  workspaceId?: string;
  customers: CustomerOption[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    project ? updateProjectAction : createProjectAction,
    {},
  );
  const value = (field: "name" | "description" | "customerId", fallback: string) => state.values?.[field] ?? fallback;
  // Errors without a field are about the name, the only other required input.
  const nameError = state.field ? undefined : state.error;
  const customerError = state.field === "customerId" ? state.error : undefined;

  return (
    <form action={formAction} className="space-y-4">
      {project && <input type="hidden" name="projectId" value={project.id} />}
      {workspaceId && <input type="hidden" name="workspaceId" value={workspaceId} />}
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Project name</label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Website Redesign"
          defaultValue={value("name", project?.name ?? "")}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "name-error" : undefined}
          required
        />
        <FieldError id="name-error" message={nameError} />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <Input
          id="description"
          name="description"
          placeholder="Short description of this project"
          defaultValue={value("description", project?.description ?? "")}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="customerId" className="text-sm font-medium">Customer</label>
        {/* A select only applies defaultValue when it mounts, and React resets the form after every
            submit; keying on the value just submitted keeps the user's choice after an error. */}
        <NativeSelect
          key={value("customerId", project?.organizationId ?? "")}
          id="customerId"
          name="customerId"
          defaultValue={value("customerId", project?.organizationId ?? "")}
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
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{project ? "Save changes" : "Create Project"}</Button>
        {project && (
          <Button asChild variant="ghost">
            <Link href={`/projects/${project.id}`}>Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
