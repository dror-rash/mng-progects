import { and, asc, eq, getDb, isNull, schema } from "@repo/db";

import { hashInviteToken } from "./invite-token";

/** Members with their email, for the server-rendered members list. Client forms use `listMemberOptions`. */
export async function listMembers(workspaceId: string) {
  return getDb()
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
    .orderBy(asc(schema.workspaceMember.joinedAt));
}

/** Members for client forms (e.g. assignee pickers): only id and name, never email. */
export async function listMemberOptions(workspaceId: string) {
  return getDb()
    .select({ userId: schema.workspaceMember.userId, name: schema.user.name })
    .from(schema.workspaceMember)
    .innerJoin(schema.user, eq(schema.workspaceMember.userId, schema.user.id))
    .where(eq(schema.workspaceMember.workspaceId, workspaceId))
    .orderBy(asc(schema.workspaceMember.joinedAt));
}

/** Links that haven't been revoked (expired ones are shown as expired until revoked). */
export async function listOpenInvites(workspaceId: string) {
  return getDb()
    .select({
      id: schema.workspaceInvite.id,
      createdAt: schema.workspaceInvite.createdAt,
      expiresAt: schema.workspaceInvite.expiresAt,
      role: schema.workspaceInvite.role,
    })
    .from(schema.workspaceInvite)
    .where(and(eq(schema.workspaceInvite.workspaceId, workspaceId), isNull(schema.workspaceInvite.revokedAt)))
    .orderBy(asc(schema.workspaceInvite.createdAt));
}

/** The invite for a token (by hash) with its workspace name, or null. */
export async function findInvite(token: string) {
  const [invite] = await getDb()
    .select({
      id: schema.workspaceInvite.id,
      workspaceId: schema.workspaceInvite.workspaceId,
      workspaceName: schema.workspace.name,
      expiresAt: schema.workspaceInvite.expiresAt,
      revokedAt: schema.workspaceInvite.revokedAt,
      role: schema.workspaceInvite.role,
      partnerId: schema.workspaceInvite.partnerId,
    })
    .from(schema.workspaceInvite)
    .innerJoin(schema.workspace, eq(schema.workspaceInvite.workspaceId, schema.workspace.id))
    .where(eq(schema.workspaceInvite.tokenHash, hashInviteToken(token)));
  return invite ?? null;
}
