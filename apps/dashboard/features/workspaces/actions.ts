"use server";

import { resolvePublicOrigin } from "@repo/auth/redirect";
import { getSession } from "@repo/auth/server";
import { and, eq, getDb, inArray, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

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
import { ensurePersonalWorkspace, isMember, listMemberships } from "./queries";
import { requireWorkspaceForAction } from "./require-workspace";
import { keepsAnAdmin, parseWorkspaceRole, type WorkspaceRole } from "./roles";
import { parseWorkspaceName } from "./workspace-name";

const LAST_ADMIN = "A workspace needs at least one admin";
const ADMINS_ONLY = "Only admins can manage this workspace";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function useWorkspace(workspaceId: string) {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/** The form's workspace, only for its admins. Every admin action starts here (ADR-0005). */
async function requireAdmin(formData: FormData) {
  const context = await requireWorkspaceForAction(formData);
  if (context.workspace.role !== "admin") {
    throw new Error(ADMINS_ONLY);
  }
  return context;
}

/** Leaving a workspace drops your assignments in it (ADR-0005). */
async function clearAssignments(tx: Tx, workspaceId: string, userId: string) {
  const projects = tx.select({ id: schema.project.id }).from(schema.project).where(eq(schema.project.workspaceId, workspaceId));
  await tx
    .update(schema.task)
    .set({ assigneeId: null })
    .where(and(eq(schema.task.assigneeId, userId), inArray(schema.task.projectId, projects)));
}

function memberOf(workspaceId: string, userId: string) {
  return and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, userId));
}

/**
 * Gives `userId` a new role, or removes them (`role: null`) and clears their assignments, keeping at
 * least one admin (ADR-0005). The workspace row is locked first, so two admins changing each other at
 * once can't both pass the check; `adminId` (who is acting) must still be an admin under that lock.
 */
async function changeMembership(
  workspaceId: string,
  change: { userId: string; role: WorkspaceRole | null },
  adminId?: string,
): Promise<"done" | "not-a-member" | "not-an-admin" | "last-admin"> {
  return getDb().transaction(async (tx) => {
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
      await tx.update(schema.workspaceMember).set({ role: change.role }).where(memberOf(workspaceId, change.userId));
    } else {
      await tx.delete(schema.workspaceMember).where(memberOf(workspaceId, change.userId));
      await clearAssignments(tx, workspaceId, change.userId);
    }
    return "done";
  });
}

/** For actions without a form state: anything but "done" is an error. */
function assertDone(result: Awaited<ReturnType<typeof changeMembership>>) {
  const errors = { "not-a-member": "Not a member of this workspace", "not-an-admin": ADMINS_ONLY, "last-admin": LAST_ADMIN };
  if (result !== "done") {
    throw new Error(errors[result]);
  }
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

export type InviteState = FormState & { link?: string };

/** Creates a link and returns it once; only its hash is stored. */
export async function createInviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { session, workspace } = await requireWorkspaceForAction(formData);
  if (workspace.role !== "admin") {
    return { error: ADMINS_ONLY };
  }
  const token = newInviteToken();
  await getDb()
    .insert(schema.workspaceInvite)
    .values({
      id: crypto.randomUUID(),
      workspaceId: workspace.id,
      tokenHash: hashInviteToken(token),
      createdBy: session.user.id,
      expiresAt: inviteExpiresAt(new Date()),
    });
  revalidatePath("/workspace");
  return { link: new URL(`/dashboard/invite/${token}`, await publicOrigin()).toString() };
}

export async function revokeInviteAction(formData: FormData) {
  const { workspace } = await requireAdmin(formData);
  const revoked = await getDb()
    .update(schema.workspaceInvite)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.workspaceInvite.id, String(formData.get("inviteId") ?? "")),
        eq(schema.workspaceInvite.workspaceId, workspace.id),
      ),
    )
    .returning({ id: schema.workspaceInvite.id });
  if (revoked.length === 0) {
    throw new Error("Invite link not found");
  }
  revalidatePath("/workspace");
}

export async function changeRoleAction(formData: FormData) {
  const { session, workspace } = await requireAdmin(formData);
  const role = parseWorkspaceRole(formData.get("role"));
  if (!role) {
    throw new Error("Unknown role");
  }
  assertDone(await changeMembership(workspace.id, { userId: String(formData.get("userId") ?? ""), role }, session.user.id));
  revalidatePath("/workspace");
}

export async function removeMemberAction(formData: FormData) {
  const { session, workspace } = await requireAdmin(formData);
  assertDone(await changeMembership(workspace.id, { userId: String(formData.get("userId") ?? ""), role: null }, session.user.id));
  revalidatePath("/workspace");
}

export async function leaveWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction(formData);
  const result = await changeMembership(workspace.id, { userId: session.user.id, role: null });
  if (result === "last-admin") {
    return { error: LAST_ADMIN };
  }
  assertDone(result);
  (await cookies()).delete(WORKSPACE_COOKIE);
  redirect("/");
}

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
  if (!invite || inviteState(invite, new Date()) !== "valid") {
    // The cookie is left to expire: changing it here would re-render the page and drop this message.
    return { error: "This invite link is invalid or has expired" };
  }
  clearInviteToken(jar);
  // Someone joining before ever opening the dashboard gets their own workspace too, to switch back to.
  if ((await listMemberships(session.user.id)).length === 0) {
    await ensurePersonalWorkspace(session.user);
  }
  await getDb()
    .insert(schema.workspaceMember)
    .values({ workspaceId: invite.workspaceId, userId: session.user.id, role: "member" })
    .onConflictDoNothing();
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
  if (!(await isMember(session.user.id, workspaceId))) {
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
  const id = crypto.randomUUID();
  await getDb().transaction(async (tx) => {
    await tx.insert(schema.workspace).values({ id, name: name.value });
    await tx.insert(schema.workspaceMember).values({ workspaceId: id, userId: session.user.id, role: "admin" });
  });
  await useWorkspace(id);
  redirect("/");
}
