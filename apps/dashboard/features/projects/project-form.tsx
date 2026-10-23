"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createProjectAction, updateProjectAction } from "./actions";

type Project = { id: string; name: string; description: string | null };

/** Create a project, or edit one when `project` is given. Shows validation errors and keeps what was typed. */
export function ProjectForm({ project }: { project?: Project }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    project ? updateProjectAction : createProjectAction,
    {},
  );
  const value = (field: "name" | "description", fallback: string) => state.values?.[field] ?? fallback;

  return (
    <form action={formAction} className="space-y-4">
      {project && <input type="hidden" name="projectId" value={project.id} />}
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Project name</label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Website Redesign"
          defaultValue={value("name", project?.name ?? "")}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "name-error" : undefined}
          required
        />
        <FieldError id="name-error" message={state.error} />
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
