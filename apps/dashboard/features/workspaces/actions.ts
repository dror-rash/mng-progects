"use server";

import { resolvePublicOrigin } from "@repo/auth/redirect";
import { getSession } from "@repo/auth/server";
import { and, eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";

import { WORKSPACE_COOKIE } from "./current-workspace";
import { hashInviteToken, inviteExpiresAt, inviteState, newInviteToken } from "./invite-token";
import { findInvite, listMembers } from "./members";
import { ensurePersonalWorkspace, isMember, listMemberships } from "./queries";
import { requireWorkspaceForAction } from "./require-workspace";
import { keepsAnAdmin, parseWorkspaceRole } from "./roles";
import { parseWorkspaceName } from "./workspace-name";

const LAST_ADMIN = "A workspace needs at least one admin";

async function useWorkspace(workspaceId: string) {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/** The current workspace, only for its admins. Every admin action starts here (ADR-0005). */
async function requireAdmin() {
  const context = await requireWorkspaceForAction();
  if (context.workspace.role !== "admin") {
    throw new Error("Only admins can manage this workspace");
  }
  return context;
}

function memberOf(workspaceId: string, userId: string) {
  return and(eq(schema.workspaceMember.workspaceId, workspaceId), eq(schema.workspaceMember.userId, userId));
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
export async function createInviteAction(_prev: InviteState): Promise<InviteState> {
  const { session, workspace } = await requireAdmin();
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
  const { workspace } = await requireAdmin();
  await getDb()
    .update(schema.workspaceInvite)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.workspaceInvite.id, String(formData.get("inviteId") ?? "")),
        eq(schema.workspaceInvite.workspaceId, workspace.id),
      ),
    );
  revalidatePath("/workspace");
}

export async function changeRoleAction(formData: FormData) {
  const { workspace } = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = parseWorkspaceRole(formData.get("role"));
  if (!role) {
    throw new Error("Unknown role");
  }
  if (!keepsAnAdmin(await listMembers(workspace.id), { userId, role })) {
    throw new Error(LAST_ADMIN);
  }
  await getDb().update(schema.workspaceMember).set({ role }).where(memberOf(workspace.id, userId));
  revalidatePath("/workspace");
}

export async function removeMemberAction(formData: FormData) {
  const { workspace } = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!keepsAnAdmin(await listMembers(workspace.id), { userId, role: null })) {
    throw new Error(LAST_ADMIN);
  }
  await getDb().delete(schema.workspaceMember).where(memberOf(workspace.id, userId));
  revalidatePath("/workspace");
}

export async function leaveWorkspaceAction(_prev: FormState): Promise<FormState> {
  const { session, workspace } = await requireWorkspaceForAction();
  if (!keepsAnAdmin(await listMembers(workspace.id), { userId: session.user.id, role: null })) {
    return { error: LAST_ADMIN };
  }
  await getDb().delete(schema.workspaceMember).where(memberOf(workspace.id, session.user.id));
  (await cookies()).delete(WORKSPACE_COOKIE);
  redirect("/");
}

/** Joins the invite's workspace and switches to it. The link is checked again here, not just on the page. */
export async function joinWorkspaceAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const invite = await findInvite(String(formData.get("token") ?? ""));
  if (!invite || inviteState(invite, new Date()) !== "valid") {
    throw new Error("This invite link is invalid or has expired");
  }
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
  const db = getDb();
  await db.insert(schema.workspace).values({ id, name: name.value });
  await db.insert(schema.workspaceMember).values({ workspaceId: id, userId: session.user.id, role: "admin" });
  await useWorkspace(id);
  redirect("/");
}
