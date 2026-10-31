import { and, asc, eq, getDb, schema, sql, withAccess } from "@repo/db";
import { cache } from "react";

import { personalWorkspaceName } from "./current-workspace";

async function queryMemberships(userId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({
        workspaceId: schema.workspaceMember.workspaceId,
        role: schema.workspaceMember.role,
        partnerId: schema.workspaceMember.partnerId,
        joinedAt: schema.workspaceMember.joinedAt,
        name: schema.workspace.name,
      })
      .from(schema.workspaceMember)
      .innerJoin(schema.workspace, eq(schema.workspaceMember.workspaceId, schema.workspace.id))
      .where(eq(schema.workspaceMember.userId, userId))
      .orderBy(asc(schema.workspaceMember.joinedAt), asc(schema.workspaceMember.workspaceId)),
  );
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
 * Creates a workspace named `name` with `userId` as its admin and returns its id, through the database
 * function `create_workspace` (row-level security lets only admins add memberships). Only for yourself.
 */
export async function createWorkspace(userId: string, name: string): Promise<string> {
  const { rows } = await withAccess(userId, () =>
    getDb().execute<{ id: string }>(sql`select create_workspace(${userId}, ${name}) as id`),
  );
  return rows[0]!.id;
}

/**
 * Creates a personal workspace (as admin) for a user who belongs to none. A per-user lock makes two
 * concurrent first requests create it only once: the second finds the first one's membership. Only
 * memberships that give access count (`access_role`): a user of a deleted partner company (design rule 8c)
 * belongs to nothing they can open, so they get a personal workspace like someone new.
 */
export async function ensurePersonalWorkspace(user: { id: string; name: string }) {
  await withAccess(user.id, async () => {
    const db = getDb();
    await db.execute(sql`select pg_advisory_xact_lock(hashtext(${`personal-workspace:${user.id}`}))`);
    await db.execute(
      sql`select create_workspace(${user.id}, ${personalWorkspaceName(user.name)})
          where not exists (
            select 1 from workspace_member m
            cross join lateral access_role(${user.id}, m.workspace_id) a
            where m.user_id = ${user.id}
          )`,
    );
  });
  requestMemberships().delete(user.id);
}

/** Whether `userId` belongs to the workspace, as the acting user sees it: call it inside their `withAccess`. */
export async function isMember(userId: string, workspaceId: string) {
  const [row] = await getDb()
    .select({ userId: schema.workspaceMember.userId })
    .from(schema.workspaceMember)
    .where(and(eq(schema.workspaceMember.userId, userId), eq(schema.workspaceMember.workspaceId, workspaceId)));
  return row !== undefined;
}
