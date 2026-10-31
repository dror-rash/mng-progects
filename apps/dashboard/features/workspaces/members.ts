import { and, asc, eq, getDb, isNull, schema, sql, withAccess } from "@repo/db";

import { hashInviteToken } from "./invite-token";

/** Members with their email, for the server-rendered members list. Client forms use `listMemberOptions`. */
export async function listMembers(userId: string, workspaceId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({
        userId: schema.workspaceMember.userId,
        role: schema.workspaceMember.role,
        joinedAt: schema.workspaceMember.joinedAt,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.workspaceMember)
      .innerJoin(schema.user, eq(schema.workspaceMember.userId, schema.user.id))
      .where(eq(schema.workspaceMember.workspaceId, workspaceId))
      .orderBy(asc(schema.workspaceMember.joinedAt)),
  );
}

/** Members for client forms (e.g. assignee pickers): only id and name, never email. */
export async function listMemberOptions(userId: string, workspaceId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({ userId: schema.workspaceMember.userId, name: schema.user.name })
      .from(schema.workspaceMember)
      .innerJoin(schema.user, eq(schema.workspaceMember.userId, schema.user.id))
      .where(eq(schema.workspaceMember.workspaceId, workspaceId))
      .orderBy(asc(schema.workspaceMember.joinedAt)),
  );
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
      })
      .from(schema.workspaceInvite)
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
};

/**
 * The invite for a token (by hash) with its workspace name, or null. Read through the database function
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
  };
}
