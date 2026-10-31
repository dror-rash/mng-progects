import { getSession } from "@repo/auth/server";

import { requireCustomerChange } from "@/features/access/require-change";

import type { OrganizationKind } from "./organization-kinds";
import { getOrganizationForUser } from "./queries";

/**
 * For server actions that write an organization, its contacts or notes: the session and the organization
 * if the signed-in user can change it (`can_change_customer`, ADR-0006), or throws the same error as for
 * a missing one. The session is for actions that also need to know who is acting (e.g. a note's author).
 */
export async function requireOrganizationSession(id: string, kind: OrganizationKind) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  await requireCustomerChange(session.user.id, id);
  const organization = await getOrganizationForUser(session.user.id, id, kind);
  if (!organization) {
    throw new Error("Not found");
  }
  return { session, organization };
}

/** For server actions that write an organization: as `requireOrganizationSession`, without the session. */
export async function requireOrganizationAccess(id: string, kind: OrganizationKind) {
  return (await requireOrganizationSession(id, kind)).organization;
}
