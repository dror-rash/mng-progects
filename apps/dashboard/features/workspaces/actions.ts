"use server";

import { resolvePublicOrigin } from "@repo/auth/redirect";
import { getSession } from "@repo/auth/server";
import { and, type Db, eq, getDb, isNull, schema, sql, withAccess } from "@repo/db";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { isAdmin } from "@/features/access/require-change";
import { type AssignableRole, keepsAnAdmin, parseAssignableRole } from "@/features/access/roles";
import { type FormState, invalid } from "@/features/forms/form-state";

import { WORKSPACE_COOKIE } from "./current-workspace";
import {
  clearInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  inviteState,
  newInviteToken,
  readInviteToken,
} from "./invite-token";
import { findInvite } from "./members";
import { ADMINS_ONLY, membershipError, type MembershipResult } from "./membership-errors";
import { createWorkspace, ensurePersonalWorkspace, isMember, listMemberships } from "./queries";
import { requireWorkspaceForAction } from "./require-workspace";
import { parseWorkspaceName } from "./workspace-name";

async function useWorkspace(workspaceId: string) {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/** The form's workspace, or null when I'm not its admin. Every admin action starts here (ADR-0005, ADR-0006). */
async function adminContext(formData: FormData) {
  const context = await requireWorkspaceForAction(formData);
  return (await isAdmin(context.session.user.id, context.workspace.id)) ? context : null;
}

/**
 * Leaving a workspace drops your assignments in it (ADR-0005), all of them: the database function runs as
 * the owner, since the leaver (an auditor, say) may not be allowed to change those tasks. Run it while
 * they are still a member, as themself or an admin.
 */
async function clearAssignments(tx: Db, workspaceId: string, userId: string) {
  await tx.execute(sql`select clear_assignments(${workspaceId}, ${userId})`);
}

function memberOf(workspaceId: string, userId: string) {
  return and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, userId));
}

/** Revokes every open invite link of a workspace (ADR-0005: optional when removing a member). */
async function revokeOpenInvites(tx: Db, workspaceId: string) {
  await tx
    .update(schema.workspaceInvite)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.workspaceInvite.workspaceId, workspaceId), isNull(schema.workspaceInvite.revokedAt)));
}

/**
 * Gives `userId` a new role, or removes them (`role: null`) and clears their assignments, keeping at
 * least one admin (ADR-0005). The workspace row is locked first, so two admins changing each other at
 * once can't both pass the check; `adminId` (who is acting) must still be an admin under that lock.
 * `revokeInvites` also revokes the workspace's open invite links when someone is removed. Runs as
 * `adminId`, or as the member themself when they leave.
 */
async function changeMembership(
  workspaceId: string,
  change: { userId: string; role: AssignableRole | null },
  adminId?: string,
  { revokeInvites = false }: { revokeInvites?: boolean } = {},
): Promise<MembershipResult> {
  return withAccess(adminId ?? change.userId, async () => {
    const tx = getDb();
    // Row-level security returns (and locks) the row only for admins; a non-admin leaving can't remove the last admin anyway.
    await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId)).for("update");
    const members = await tx
      .select({ userId: schema.workspaceMember.userId, role: schema.workspaceMember.role })
      .from(schema.workspaceMember)
      .where(eq(schema.workspaceMember.workspaceId, workspaceId));
    if (adminId && members.find((m) => m.userId === adminId)?.role !== "admin") {
      return "not-an-admin";
    }
    if (!members.some((m) => m.userId === change.userId)) {
      return "not-a-member";
    }
    if (!keepsAnAdmin(members, change)) {
      return "last-admin";
    }
    if (change.role) {
      // Admins and auditors belong to no partner company (a check constraint ties partner_id to the role).
      await tx
        .update(schema.workspaceMember)
        .set({ role: change.role, partnerId: null })
        .where(memberOf(workspaceId, change.userId));
    } else {
      await clearAssignments(tx, workspaceId, change.userId);
      await tx.delete(schema.workspaceMember).where(memberOf(workspaceId, change.userId));
      if (revokeInvites) {
        await revokeOpenInvites(tx, workspaceId);
      }
    }
    return "done";
  });
}

async function publicOrigin() {
  const h = await headers();
  return resolvePublicOrigin({
    configured: process.env.BETTER_AUTH_URL,
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
    fallbackOrigin: `http://${h.get("host") ?? "localhost"}`,
  });
}

/** A created link comes back once, with the role it gives. */
export type InviteState = FormState & { link?: string; role?: AssignableRole };

/** Creates a link for the chosen role and returns it once; only its hash is stored. */
export async function createInviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const context = await adminContext(formData);
  if (!context) {
    return { error: ADMINS_ONLY };
  }
  const { session, workspace } = context;
  const role = parseAssignableRole(formData.get("role"));
  if (!role) {
    return invalid("Choose a role", formData, "role");
  }
  const token = newInviteToken();
  await withAccess(session.user.id, () =>
    getDb()
      .insert(schema.workspaceInvite)
      .values({
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        tokenHash: hashInviteToken(token),
        createdBy: session.user.id,
        expiresAt: inviteExpiresAt(new Date()),
        role,
      }),
  );
  revalidatePath("/workspace");
  return { link: new URL(`/dashboard/invite/${token}`, await publicOrigin()).toString(), role };
}

export async function revokeInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await adminContext(formData);
  if (!context) {
    return { error: ADMINS_ONLY };
  }
  const revoked = await withAccess(context.session.user.id, () =>
    getDb()
      .update(schema.workspaceInvite)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.workspaceInvite.id, String(formData.get("inviteId") ?? "")),
          eq(schema.workspaceInvite.workspaceId, context.workspace.id),
          isNull(schema.workspaceInvite.revokedAt),
        ),
      )
      .returning({ id: schema.workspaceInvite.id }),
  );
  if (revoked.length === 0) {
    return { error: "This invite link was already revoked" };
  }
  revalidatePath("/workspace");
  return {};
}

export async function changeRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await adminContext(formData);
  if (!context) {
    return { error: ADMINS_ONLY };
  }
  const role = parseAssignableRole(formData.get("role"));
  if (!role) {
    return { error: "Unknown role" };
  }
  const userId = String(formData.get("userId") ?? "");
  const error = membershipError(await changeMembership(context.workspace.id, { userId, role }, context.session.user.id));
  if (error) {
    return { error };
  }
  revalidatePath("/workspace");
  return {};
}

export async function removeMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await adminContext(formData);
  if (!context) {
    return { error: ADMINS_ONLY };
  }
  const userId = String(formData.get("userId") ?? "");
  const revokeInvites = formData.get("revokeInvites") === "on";
  const error = membershipError(
    await changeMembership(context.workspace.id, { userId, role: null }, context.session.user.id, { revokeInvites }),
  );
  if (error) {
    return { error };
  }
  revalidatePath("/workspace");
  return {};
}

export async function leaveWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction(formData);
  const error = membershipError(await changeMembership(workspace.id, { userId: session.user.id, role: null }));
  if (error) {
    return { error };
  }
  (await cookies()).delete(WORKSPACE_COOKIE);
  redirect("/");
}

const INVALID_INVITE = "This invite link is invalid or has expired";

/**
 * Joins the invite's workspace and switches to it. The token comes from the invite cookie (not the form),
 * and the link is checked again here, not just on the page: it may have been revoked since.
 */
export async function joinWorkspaceAction(_prev: FormState, _formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const jar = await cookies();
  const token = readInviteToken(jar);
  const invite = token ? await findInvite(token) : null;
  if (!token || !invite || inviteState(invite, new Date()) !== "valid") {
    // The cookie is left to expire: changing it here would re-render the page and drop this message.
    return { error: INVALID_INVITE };
  }
  // Someone joining before ever opening the dashboard gets their own workspace too, to switch back to.
  if ((await listMemberships(session.user.id)).length === 0) {
    await ensurePersonalWorkspace(session.user);
  }
  // Checked again in the database, which adds the membership (row-level security lets only admins).
  const { rows } = await withAccess(session.user.id, () =>
    getDb().execute<{ result: string }>(sql`select join_workspace(${session.user.id}, ${hashInviteToken(token)}) as result`),
  );
  if (rows[0]?.result === "invalid") {
    return { error: INVALID_INVITE };
  }
  clearInviteToken(jar);
  await useWorkspace(invite.workspaceId);
  redirect("/");
}

/** Makes another of my workspaces the current one. Membership is checked here, not trusted from the form. */
export async function switchWorkspaceAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!(await withAccess(session.user.id, () => isMember(session.user.id, workspaceId)))) {
    throw new Error("Not a member of that workspace");
  }
  await useWorkspace(workspaceId);
  redirect("/");
}

/** Creates a workspace with me as its admin and switches to it. */
export async function createWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const name = parseWorkspaceName(formData.get("name"));
  if (!name.ok) {
    return invalid(name.error, formData, "name");
  }
  const id = await createWorkspace(session.user.id, name.value);
  await useWorkspace(id);
  redirect("/");
}
