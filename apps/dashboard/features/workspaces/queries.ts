import { and, asc, eq, getDb, schema } from "@repo/db";
import { cache } from "react";

import { personalWorkspaceName } from "./current-workspace";

async function queryMemberships(userId: string) {
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
    .orderBy(asc(schema.workspaceMember.joinedAt), asc(schema.workspaceMember.workspaceId));
}

/**
 * This request's membership lookups, by user id. React's `cache` keeps one map per server render;
 * outside a render (in a server action) it gives a new map on every call, so nothing is reused there.
 */
const requestMemberships = cache(() => new Map<string, ReturnType<typeof queryMemberships>>());

/**
 * The user's workspaces with their role, oldest membership first (ties by workspace id, so the default
 * workspace doesn't change between loads). Queried once per request; `ensurePersonalWorkspace` forgets it.
 */
export function listMemberships(userId: string) {
  const lookups = requestMemberships();
  let memberships = lookups.get(userId);
  if (!memberships) {
    memberships = queryMemberships(userId);
    lookups.set(userId, memberships);
  }
  return memberships;
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
  requestMemberships().delete(user.id);
}

export async function isMember(userId: string, workspaceId: string) {
  const [row] = await getDb()
    .select({ userId: schema.workspaceMember.userId })
    .from(schema.workspaceMember)
    .where(and(eq(schema.workspaceMember.userId, userId), eq(schema.workspaceMember.workspaceId, workspaceId)));
  return row !== undefined;
}
