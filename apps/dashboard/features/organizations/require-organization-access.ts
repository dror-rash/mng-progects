import { getSession } from "@repo/auth/server";

import type { OrganizationKind } from "./organization-kinds";
import { getOrganizationForUser } from "./queries";

/**
 * For server actions: the session and the organization if the signed-in user is a member of its
 * workspace, or throws. For actions that also need to know who is acting (e.g. a note's author).
 */
export async function requireOrganizationSession(id: string, kind: OrganizationKind) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const organization = await getOrganizationForUser(session.user.id, id, kind);
  if (!organization) {
    throw new Error("Not found");
  }
  return { session, organization };
}

/** For server actions: the organization if the signed-in user is a member of its workspace, or throws. */
export async function requireOrganizationAccess(id: string, kind: OrganizationKind) {
  return (await requireOrganizationSession(id, kind)).organization;
}
