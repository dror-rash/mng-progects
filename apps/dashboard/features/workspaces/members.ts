import { and, asc, eq, getDb, isNull, or, schema, sql, withAccess } from "@repo/db";

import type { WorkspaceRole } from "@/features/access/roles";

import { hashInviteToken } from "./invite-token";

/**
 * Members with their email and, for a partner's users, the partner's name, for the server-rendered members
 * list. Assignee pickers use `listAssigneeOptions`.
 */
export async function listMembers(userId: string, workspaceId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({
        userId: schema.workspaceMember.userId,
        role: schema.workspaceMember.role,
        partnerId: schema.workspaceMember.partnerId,
        partnerName: schema.partner.name,
        joinedAt: schema.workspaceMember.joinedAt,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.workspaceMember)
      .innerJoin(schema.user, eq(schema.workspaceMember.userId, schema.user.id))
      .leftJoin(schema.partner, eq(schema.partner.id, schema.workspaceMember.partnerId))
      .where(eq(schema.workspaceMember.workspaceId, workspaceId))
      .orderBy(asc(schema.workspaceMember.joinedAt)),
  );
}

/**
 * Who may be assigned a task in `project` (rule 7): its partner's users and admins for a partner's
 * project, admins only for an internal one. Auditors never: they can't change anything.
 */
function assignable(project: { workspaceId: string; partnerId: string | null }) {
  const admin = eq(schema.workspaceMember.role, "admin" satisfies WorkspaceRole);
  return and(
    eq(schema.workspaceMember.workspaceId, project.workspaceId),
    project.partnerId
      ? or(
          admin,
          and(eq(schema.workspaceMember.role, "partner" satisfies WorkspaceRole), eq(schema.workspaceMember.partnerId, project.partnerId)),
        )
      : admin,
  );
}

/** The assignee choices for a task in `project`, for client forms: only id and name, never email. */
export async function listAssigneeOptions(userId: string, project: { workspaceId: string; partnerId: string | null }) {
  return withAccess(userId, async () =>
    getDb()
      .select({ userId: schema.workspaceMember.userId, name: schema.user.name })
      .from(schema.workspaceMember)
      .innerJoin(schema.user, eq(schema.workspaceMember.userId, schema.user.id))
      .where(assignable(project))
      .orderBy(asc(schema.workspaceMember.joinedAt)),
  );
}

/**
 * Whether `assigneeId` may be assigned a task in `project`, as the acting user sees the members: the
 * server check behind `listAssigneeOptions`. Inside the action's `withAccess`.
 */
export async function isAssignable(assigneeId: string, project: { workspaceId: string; partnerId: string | null }) {
  const [row] = await getDb()
    .select({ userId: schema.workspaceMember.userId })
    .from(schema.workspaceMember)
    .where(and(eq(schema.workspaceMember.userId, assigneeId), assignable(project)));
  return row !== undefined;
}

/** Links that haven't been revoked (expired ones are shown as expired until revoked). Admins only (row-level security). */
export async function listOpenInvites(userId: string, workspaceId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({
        id: schema.workspaceInvite.id,
        createdAt: schema.workspaceInvite.createdAt,
        expiresAt: schema.workspaceInvite.expiresAt,
        role: schema.workspaceInvite.role,
        partnerName: schema.partner.name,
      })
      .from(schema.workspaceInvite)
      .leftJoin(schema.partner, eq(schema.partner.id, schema.workspaceInvite.partnerId))
      .where(and(eq(schema.workspaceInvite.workspaceId, workspaceId), isNull(schema.workspaceInvite.revokedAt)))
      .orderBy(asc(schema.workspaceInvite.createdAt)),
  );
}

/** A raw `timestamp` value (text, stored as UTC wall time, as Drizzle's timestamp columns write it) as a Date. */
function utc(value: string): Date {
  return new Date(`${value}+0000`);
}

type InviteRow = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  expires_at: string;
  revoked_at: string | null;
  role: string;
  partner_id: string | null;
  partner_deleted: boolean;
};

/**
 * The invite for a token (by hash) with its workspace name and whether its partner is deleted, or null. Read through the database function
 * `find_invite`: whoever holds a link isn't a member yet, so row-level security hides the invite from them.
 */
export async function findInvite(token: string) {
  const { rows } = await getDb().execute<InviteRow>(sql`select * from find_invite(${hashInviteToken(token)})`);
  const invite = rows[0];
  if (!invite) return null;
  return {
    id: invite.id,
    workspaceId: invite.workspace_id,
    workspaceName: invite.workspace_name,
    expiresAt: utc(invite.expires_at),
    revokedAt: invite.revoked_at === null ? null : utc(invite.revoked_at),
    role: invite.role,
    partnerId: invite.partner_id,
    partnerDeleted: invite.partner_deleted,
  };
}
