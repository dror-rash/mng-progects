import { getDb, sql, withAccess } from "@repo/db";

import { normalizeWorkspaceRole, type WorkspaceRole } from "./roles";

/** One access function's answer for this user and record (see `predicates.ts`). */
async function allowed(
  check: "can_change_project" | "can_work_on_project" | "can_change_customer" | "can_change_site",
  userId: string,
  id: string,
) {
  const { rows } = await withAccess(userId, () =>
    getDb().execute<{ allowed: boolean }>(sql`select ${sql.raw(check)}(${userId}, ${id}) as allowed`),
  );
  return rows[0]?.allowed === true;
}

/**
 * For actions that write a project or its tasks: throws unless `userId` can change the project. The same
 * error as a missing project, so a refused write doesn't tell whether the project exists.
 */
export async function requireProjectChange(userId: string, projectId: string): Promise<void> {
  if (!(await allowed("can_change_project", userId, projectId))) {
    throw new Error("Not found");
  }
}

/**
 * For actions that add, edit or move a project's tasks: throws unless `userId` can work on the project
 * (`can_work_on_project`: those who can change it, and its crew's workers, task 056). Same error as missing.
 */
export async function requireProjectWork(userId: string, projectId: string): Promise<void> {
  if (!(await allowed("can_work_on_project", userId, projectId))) {
    throw new Error("Not found");
  }
}

/** For actions that write a customer, its contacts or notes: throws unless `userId` can change it. */
export async function requireCustomerChange(userId: string, orgId: string): Promise<void> {
  if (!(await allowed("can_change_customer", userId, orgId))) {
    throw new Error("Not found");
  }
}

/** For actions that write a site or its contacts (task 054): throws unless `userId` can change the site. */
export async function requireSiteChange(userId: string, siteId: string): Promise<void> {
  if (!(await allowed("can_change_site", userId, siteId))) {
    throw new Error("Not found");
  }
}

/**
 * `userId`'s role in the workspace and, for a partner's user, their partner, by `access_role`; null for
 * someone who isn't a member (or whose partner is deleted). For a record's workspace, which may not be the
 * current one.
 */
export async function workspaceAccess(
  userId: string,
  workspaceId: string,
): Promise<{ role: WorkspaceRole; partnerId: string | null } | null> {
  const { rows } = await withAccess(userId, () =>
    getDb().execute<{ role: string; partner_id: string | null }>(
      sql`select role, partner_id from access_role(${userId}, ${workspaceId})`,
    ),
  );
  const row = rows[0];
  return row ? { role: normalizeWorkspaceRole(row.role), partnerId: row.partner_id } : null;
}

/** Whether `userId` is an admin of the workspace, by `access_role` (members, invites, settings). */
export async function isAdmin(userId: string, workspaceId: string): Promise<boolean> {
  return (await workspaceAccess(userId, workspaceId))?.role === "admin";
}

/** For admin-only actions without a form error to show: throws unless `userId` is an admin of the workspace. */
export async function requireAdmin(userId: string, workspaceId: string): Promise<void> {
  if (!(await isAdmin(userId, workspaceId))) {
    throw new Error("Not found");
  }
}
