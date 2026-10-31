"use server";

import { eq, getDb, schema } from "@repo/db";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";
import { customerInWorkspace } from "@/features/organizations/queries";
import { requireWorkspaceForAction } from "@/features/workspaces/require-workspace";

import { parseProjectInput } from "./project-input";
import { requireProjectAccess } from "./require-project-access";
import { revalidateOverviews } from "./revalidate";

export async function createProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction(formData);
  const input = parseProjectInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData);
  }
  if (!(await customerInWorkspace(workspace.id, input.value.organizationId))) {
    return invalid("Choose one of your customers", formData, "customerId");
  }

  const id = crypto.randomUUID();
  await getDb()
    .insert(schema.project)
    .values({ id, ...input.value, ownerId: session.user.id, workspaceId: workspace.id });
  revalidateOverviews();
  redirect(`/projects/${id}`);
}

export async function updateProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const project = await requireProjectAccess(String(formData.get("projectId") ?? ""));
  const input = parseProjectInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData);
  }
  if (!(await customerInWorkspace(project.workspaceId, input.value.organizationId))) {
    return invalid("Choose one of your customers", formData, "customerId");
  }

  await getDb()
    .update(schema.project)
    .set({ ...input.value, updatedAt: new Date() })
    .where(eq(schema.project.id, project.id));
  revalidateOverviews();
  redirect(`/projects/${project.id}`);
}

/** Tasks go with the project (`onDelete: "cascade"`). */
export async function deleteProjectAction(formData: FormData) {
  const project = await requireProjectAccess(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.project).where(eq(schema.project.id, project.id));
  revalidateOverviews();
  redirect("/");
}
