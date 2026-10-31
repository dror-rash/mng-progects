"use server";

import { eq, getDb, schema, withAccess } from "@repo/db";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/features/access/require-change";
import { requireActionSession } from "@/features/auth/require-session";
import { type FormState, invalid } from "@/features/forms/form-state";
import { customerInWorkspace } from "@/features/organizations/queries";
import { requireWorkspaceForAction } from "@/features/workspaces/require-workspace";

import { parseProjectInput } from "./project-input";
import { requireProjectAccess } from "./require-project-access";
import { revalidateOverviews } from "./revalidate";

// Each action does its reads and writes in one `withAccess` transaction, and redirects after it commits.

export async function createProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction(formData);
  const result = await withAccess(session.user.id, async () => {
    // Internal projects only, for now: partners create their own partner's projects with task 049.
    await requireAdmin(session.user.id, workspace.id);
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
    return { id };
  });
  if (!("id" in result)) {
    return result;
  }
  revalidateOverviews();
  redirect(`/projects/${result.id}`);
}

export async function updateProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireActionSession();
  const result = await withAccess(session.user.id, async () => {
    const project = await requireProjectAccess(session.user.id, String(formData.get("projectId") ?? ""));
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
    return { id: project.id };
  });
  if (!("id" in result)) {
    return result;
  }
  revalidateOverviews();
  redirect(`/projects/${result.id}`);
}

/** Tasks go with the project (`onDelete: "cascade"`). */
export async function deleteProjectAction(formData: FormData) {
  const session = await requireActionSession();
  await withAccess(session.user.id, async () => {
    const project = await requireProjectAccess(session.user.id, String(formData.get("projectId") ?? ""));
    await getDb().delete(schema.project).where(eq(schema.project.id, project.id));
  });
  revalidateOverviews();
  redirect("/");
}
