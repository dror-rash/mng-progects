"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { NativeSelect } from "@repo/ui/native-select";
import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createProjectAction, updateProjectAction } from "./actions";
import { copyProjectAction } from "./copy-project";

type Project = { id: string; name: string; description: string | null; organizationId: string | null };
type Source = { id: string; name: string; organizationId: string | null };
type CustomerOption = { id: string; name: string };
type OwnerOption = { value: string; label: string };

/**
 * Create a project, edit one when `project` is given, or copy one into a new project when `copyOf` is
 * given (its description and tasks come along, rule 4a). Shows validation errors and keeps what was typed
 * or chosen.
 */
export function ProjectForm({
  project,
  copyOf,
  workspaceId,
  customers,
  defaultCustomerId,
  cancelHref,
  owners,
  defaultOwner,
  customerRequired = false,
}: {
  project?: Project;
  /** The project to copy: the name and customer start from it. */
  copyOf?: Source;
  /** For a new project or a copy: the workspace it goes in. */
  workspaceId?: string;
  customers: CustomerOption[];
  /** For a new project: the customer chosen to start with. */
  defaultCustomerId?: string;
  /** Where Cancel goes; defaults to the project, or All projects for a new one. */
  cancelHref?: string;
  /** For an admin's new project or copy: the Owner choices, "Internal" first (see `project-owner.ts`). */
  owners?: OwnerOption[];
  /** The Owner choice to start with; the first one otherwise. */
  defaultOwner?: string;
  /** A partner's project always has a customer: no "No customer" choice. */
  customerRequired?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    copyOf ? copyProjectAction : project ? updateProjectAction : createProjectAction,
    {},
  );
  const value = (field: "name" | "description" | "customerId" | "owner", fallback: string) => state.values?.[field] ?? fallback;
  // Errors without a field are about the name, the only other required input.
  const nameError = state.field ? undefined : state.error;
  const customerError = state.field === "customerId" ? state.error : undefined;
  const ownerError = state.field === "owner" ? state.error : undefined;
  const owner = value("owner", defaultOwner ?? owners?.[0]?.value ?? "");
  const start = project ?? copyOf;

  return (
    <form action={formAction} className="space-y-4">
      {project && <input type="hidden" name="projectId" value={project.id} />}
      {copyOf && <input type="hidden" name="sourceId" value={copyOf.id} />}
      {workspaceId && <input type="hidden" name="workspaceId" value={workspaceId} />}
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Project name</label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Website Redesign"
          defaultValue={value("name", start?.name ?? "")}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "name-error" : undefined}
          required
        />
        <FieldError id="name-error" message={nameError} />
      </div>
      {!copyOf && (
        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <Input
            id="description"
            name="description"
            placeholder="Short description of this project"
            defaultValue={value("description", project?.description ?? "")}
          />
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor="customerId" className="text-sm font-medium">Customer</label>
        {/* A select only applies defaultValue when it mounts, and React resets the form after every
            submit; keying on the value just submitted keeps the user's choice after an error. */}
        <NativeSelect
          key={value("customerId", start?.organizationId ?? defaultCustomerId ?? "")}
          id="customerId"
          name="customerId"
          defaultValue={value("customerId", start?.organizationId ?? defaultCustomerId ?? "")}
          aria-invalid={customerError ? true : undefined}
          aria-describedby={customerError ? "customerId-error" : undefined}
        >
          {!customerRequired && <option value="">No customer</option>}
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
        <FieldError id="customerId-error" message={customerError} />
      </div>
      {owners && (
        <div className="space-y-1">
          <label htmlFor="owner" className="text-sm font-medium">Owner</label>
          {/* Keyed on the value: a select only applies defaultValue when it mounts. */}
          <NativeSelect
            key={owner}
            id="owner"
            name="owner"
            defaultValue={owner}
            aria-invalid={ownerError ? true : undefined}
            aria-describedby={ownerError ? "owner-error" : undefined}
          >
            {owners.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </NativeSelect>
          <FieldError id="owner-error" message={ownerError} />
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{copyOf ? "Copy project" : project ? "Save changes" : "Create Project"}</Button>
        <Button asChild variant="ghost">
          <Link href={cancelHref ?? (start ? `/projects/${start.id}` : "/projects")}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
