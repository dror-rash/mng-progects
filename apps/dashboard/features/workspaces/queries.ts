import { and, asc, eq, getDb, schema } from "@repo/db";

import { personalWorkspaceName } from "./current-workspace";

/** The user's workspaces with their role, oldest membership first. */
export async function listMemberships(userId: string) {
  return getDb()
    .select({
      workspaceId: schema.workspaceMember.workspaceId,
      role: schema.workspaceMember.role,
      joinedAt: schema.workspaceMember.joinedAt,
      name: schema.workspace.name,
    })
    .from(schema.workspaceMember)
    .innerJoin(schema.workspace, eq(schema.workspaceMember.workspaceId, schema.workspace.id))
    .where(eq(schema.workspaceMember.userId, userId))
    .orderBy(asc(schema.workspaceMember.joinedAt));
}

/**
 * Creates the user's personal workspace (as admin) if they belong to none. The id is derived from the
 * user id, as in migration 0012, so two concurrent first requests create it only once.
 */
export async function ensurePersonalWorkspace(user: { id: string; name: string }) {
  const id = `personal-${user.id}`;
  const db = getDb();
  await db.insert(schema.workspace).values({ id, name: personalWorkspaceName(user.name) }).onConflictDoNothing();
  await db.insert(schema.workspaceMember).values({ workspaceId: id, userId: user.id, role: "admin" }).onConflictDoNothing();
}

export async function isMember(userId: string, workspaceId: string) {
  const [row] = await getDb()
    .select({ userId: schema.workspaceMember.userId })
    .from(schema.workspaceMember)
    .where(and(eq(schema.workspaceMember.userId, userId), eq(schema.workspaceMember.workspaceId, workspaceId)));
  return row !== undefined;
}
