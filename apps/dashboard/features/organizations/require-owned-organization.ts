import { getSession } from "@repo/auth/server";

import type { OrganizationKind } from "./organization-kinds";
import { getOwnedOrganization } from "./queries";

/** For server actions: the signed-in user's organization with this id, or throws. */
export async function requireOwnedOrganization(id: string, kind: OrganizationKind) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const organization = await getOwnedOrganization(session.user.id, id, kind);
  if (!organization) {
    throw new Error("Not found");
  }
  return organization;
}
