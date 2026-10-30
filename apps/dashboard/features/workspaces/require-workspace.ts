import { cookies } from "next/headers";

import { currentSession, requireSession } from "@/features/auth/require-session";

import { currentWorkspaceId, WORKSPACE_COOKIE } from "./current-workspace";
import { ensurePersonalWorkspace, listMemberships } from "./queries";

type Session = NonNullable<Awaited<ReturnType<typeof currentSession>>>;

/** The user's current workspace (ADR-0005), creating their personal workspace on first use. */
async function currentWorkspace(session: Session) {
  let memberships = await listMemberships(session.user.id);
  if (memberships.length === 0) {
    await ensurePersonalWorkspace(session.user);
    memberships = await listMemberships(session.user.id);
  }
  const id = currentWorkspaceId(memberships, (await cookies()).get(WORKSPACE_COOKIE)?.value);
  const membership = memberships.find((m) => m.workspaceId === id);
  if (!membership) {
    throw new Error("No workspace");
  }
  return { id: membership.workspaceId, name: membership.name, role: membership.role };
}

/** For pages: the session and the current workspace, or a redirect to login (back to `path`). */
export async function requireWorkspace(path: string) {
  const session = await requireSession(path);
  return { session, workspace: await currentWorkspace(session) };
}

/**
 * For server actions: the session and the workspace the form was rendered for (its hidden `workspaceId`),
 * or throws. Not the cookie: it may have changed in another tab since the page was shown.
 */
export async function requireWorkspaceForAction(formData: FormData) {
  const session = await currentSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const membership = (await listMemberships(session.user.id)).find((m) => m.workspaceId === workspaceId);
  if (!membership) {
    throw new Error("Not a member of this workspace");
  }
  return { session, workspace: { id: membership.workspaceId, name: membership.name, role: membership.role } };
}
