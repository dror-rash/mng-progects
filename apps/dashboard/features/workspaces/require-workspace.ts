import { getSession } from "@repo/auth/server";
import { cookies } from "next/headers";

import { requireSession } from "@/features/auth/require-session";

import { currentWorkspaceId, WORKSPACE_COOKIE } from "./current-workspace";
import { ensurePersonalWorkspace, listMemberships } from "./queries";

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

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

/** For server actions: the session and the current workspace, or throws. */
export async function requireWorkspaceForAction() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return { session, workspace: await currentWorkspace(session) };
}
