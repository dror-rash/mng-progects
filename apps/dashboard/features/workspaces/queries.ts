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
 * Creates a personal workspace (as admin) for a user who belongs to none. The first one's id is derived
 * from the user id, as in migration 0012, so two concurrent first requests create it only once. If that
 * workspace already exists without them (they left or were removed), they get a new one: never rejoin it.
 */
export async function ensurePersonalWorkspace(user: { id: string; name: string }) {
  const personalId = `personal-${user.id}`;
  const name = personalWorkspaceName(user.name);
  await getDb().transaction(async (tx) => {
    const created = await tx
      .insert(schema.workspace)
      .values({ id: personalId, name })
      .onConflictDoNothing()
      .returning({ id: schema.workspace.id });
    let workspaceId = personalId;
    if (created.length === 0) {
      // The insert waited for any concurrent first request, so its membership is visible by now.
      const [member] = await tx
        .select({ userId: schema.workspaceMember.userId })
        .from(schema.workspaceMember)
        .where(and(eq(schema.workspaceMember.workspaceId, personalId), eq(schema.workspaceMember.userId, user.id)));
      if (member) {
        return;
      }
      workspaceId = crypto.randomUUID();
      await tx.insert(schema.workspace).values({ id: workspaceId, name });
    }
    await tx.insert(schema.workspaceMember).values({ workspaceId, userId: user.id, role: "admin" }).onConflictDoNothing();
  });
}

export async function isMember(userId: string, workspaceId: string) {
  const [row] = await getDb()
    .select({ userId: schema.workspaceMember.userId })
    .from(schema.workspaceMember)
    .where(and(eq(schema.workspaceMember.userId, userId), eq(schema.workspaceMember.workspaceId, workspaceId)));
  return row !== undefined;
}
