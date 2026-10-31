"use server";

import { and, eq, getDb, isNull, schema, withAccess } from "@repo/db";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/features/access/require-change";
import { requireActionSession } from "@/features/auth/require-session";
import { type FormState, invalid } from "@/features/forms/form-state";
import { isCustomerChoice } from "@/features/organizations/customer-names";
import { requireWorkspaceForAction } from "@/features/workspaces/require-workspace";

import { parseProjectInput } from "./project-input";
import { parseProjectOwner, type ProjectOwner } from "./project-owner";
import { requireProjectAccess } from "./require-project-access";
import { revalidateOverviews } from "./revalidate";

// Each action does its reads and writes in one `withAccess` transaction, and redirects after it commits.

type Workspace = Awaited<ReturnType<typeof requireWorkspaceForAction>>["workspace"];

/**
 * The new project's owner (rule 4): a partner's users always create their own partner's projects; admins
 * choose Internal or one of the workspace's partners. Auditors get the not-found refusal. Inside `withAccess`.
 */
async function newProjectOwner(userId: string, workspace: Workspace, formData: FormData): Promise<ProjectOwner | null> {
  if (workspace.role === "partner" && workspace.partnerId) {
    return { visibility: "partner", partnerId: workspace.partnerId };
  }
  await requireAdmin(userId, workspace.id);
  const owner = parseProjectOwner(formData.get("owner"));
  if (owner?.visibility !== "partner") return owner;
  const [partner] = await getDb()
    .select({ id: schema.partner.id })
    .from(schema.partner)
    .where(and(eq(schema.partner.id, owner.partnerId), eq(schema.partner.workspaceId, workspace.id), isNull(schema.partner.deletedAt)));
  return partner ? owner : null;
}

/**
 * Whether a project owned by `partnerId` (null: internal) may have the customer `organizationId`: one of
 * the acting user's customer choices, and for a partner's project one of the partner's (rule 4), which
 * it must have. Inside `withAccess`.
 */
async function customerAllowed(workspaceId: string, partnerId: string | null, organizationId: string | null) {
  if (!organizationId) return partnerId === null;
  return isCustomerChoice(workspaceId, partnerId, organizationId);
}

export async function createProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction(formData);
  const result = await withAccess(session.user.id, async () => {
    const owner = await newProjectOwner(session.user.id, workspace, formData);
    if (!owner) {
      return invalid("Choose an owner", formData, "owner");
    }
    const input = parseProjectInput(formData);
    if (!input.ok) {
      return invalid(input.error, formData);
    }
    if (!(await customerAllowed(workspace.id, owner.partnerId, input.value.organizationId))) {
      // An admin's choice of a partner and a customer that don't go together; otherwise a tampered form.
      const error = owner.partnerId && workspace.role === "admin" ? "Choose a customer assigned to this partner" : "Choose one of your customers";
      return invalid(error, formData, "customerId");
    }

    const id = crypto.randomUUID();
    await getDb()
      .insert(schema.project)
      .values({ id, ...input.value, ...owner, ownerId: session.user.id, workspaceId: workspace.id });
    return { id };
  });
  if (!("id" in result)) {
    return result;
  }
  revalidateOverviews();
  redirect(`/projects/${result.id}`);
}

/** The owner never changes (rule 4a); the customer must still suit it. */
export async function updateProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireActionSession();
  const result = await withAccess(session.user.id, async () => {
    const project = await requireProjectAccess(session.user.id, String(formData.get("projectId") ?? ""));
    const input = parseProjectInput(formData);
    if (!input.ok) {
      return invalid(input.error, formData);
    }
    if (!(await customerAllowed(project.workspaceId, project.partnerId, input.value.organizationId))) {
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
