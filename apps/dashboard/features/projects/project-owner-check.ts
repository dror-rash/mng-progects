import { and, eq, getDb, isNull, schema } from "@repo/db";

import { requireAdmin, workspaceAccess } from "@/features/access/require-change";
import { isCustomerChoice } from "@/features/organizations/customer-names";
import type { requireWorkspaceForAction } from "@/features/workspaces/require-workspace";

import { parseProjectOwner, type ProjectOwner } from "./project-owner";

// The server checks shared by creating and copying a project (rule 4). Not in a `"use server"` file,
// whose exports would all become callable actions. Each runs inside the action's `withAccess`.

type Workspace = Awaited<ReturnType<typeof requireWorkspaceForAction>>["workspace"];

/** Whether `partnerId` is one of the workspace's partners (not deleted). */
async function isWorkspacePartner(workspaceId: string, partnerId: string) {
  const [partner] = await getDb()
    .select({ id: schema.partner.id })
    .from(schema.partner)
    .where(and(eq(schema.partner.id, partnerId), eq(schema.partner.workspaceId, workspaceId), isNull(schema.partner.deletedAt)));
  return partner !== undefined;
}

/**
 * The new project's owner from a form: a partner's users always get their own partner; admins choose
 * Internal or one of the workspace's partners with the Owner select (null: blank or not a partner of
 * the workspace). Anyone else gets the not-found refusal.
 */
export async function newProjectOwner(userId: string, workspace: Workspace, formData: FormData): Promise<ProjectOwner | null> {
  if (workspace.role === "partner" && workspace.partnerId) {
    return { visibility: "partner", partnerId: workspace.partnerId };
  }
  await requireAdmin(userId, workspace.id);
  const owner = parseProjectOwner(formData.get("owner"));
  if (owner?.visibility !== "partner") return owner;
  return (await isWorkspacePartner(workspace.id, owner.partnerId)) ? owner : null;
}

/**
 * Whether `userId` may create a project in the workspace owned by `partnerId` (null: internal): their own
 * partner for a partner's user, internal or any of the workspace's partners for an admin, never otherwise.
 */
export async function mayCreateFor(userId: string, workspaceId: string, partnerId: string | null): Promise<boolean> {
  const access = await workspaceAccess(userId, workspaceId);
  if (access?.role === "partner") return partnerId !== null && partnerId === access.partnerId;
  if (access?.role !== "admin") return false;
  return partnerId === null || (await isWorkspacePartner(workspaceId, partnerId));
}

/**
 * Whether a project owned by `partnerId` (null: internal) may have the customer `organizationId`: one of
 * the acting user's customer choices, and for a partner's project one of the partner's (rule 4), which
 * it must have.
 */
export async function customerAllowed(workspaceId: string, partnerId: string | null, organizationId: string | null) {
  if (!organizationId) return partnerId === null;
  return isCustomerChoice(workspaceId, partnerId, organizationId);
}
