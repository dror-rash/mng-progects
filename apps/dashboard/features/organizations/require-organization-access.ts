import { requireCustomerChange } from "@/features/access/require-change";

import type { OrganizationKind } from "./organization-kinds";
import { getOrganizationForUser } from "./queries";

/**
 * For server actions that write an organization, its contacts or notes: the organization if `userId` can
 * change it (`can_change_customer`, ADR-0006), or throws the same error as for a missing one. Call it
 * inside the action's `withAccess(userId, …)`.
 */
export async function requireOrganizationAccess(userId: string, id: string, kind: OrganizationKind) {
  await requireCustomerChange(userId, id);
  const organization = await getOrganizationForUser(userId, id, kind);
  if (!organization) {
    throw new Error("Not found");
  }
  return organization;
}
