import { and, asc, eq, getDb, schema, withAccess } from "@repo/db";

import { partnerServesCustomer } from "@/features/access/predicates";

// Customer names as everyone may see them: through the `customer_name` view (ADR-0006), never
// `organization`, which a partner's users can't read at all. The view lists only the customers the
// signed-in user may see the name of (customers only, not deleted).

/** The workspace's customer names; for a partner's project (`partnerId`), only the partner's customers (rules 4, 7a). */
function customerChoices(workspaceId: string, partnerId: string | null) {
  return and(
    eq(schema.customerName.workspaceId, workspaceId),
    partnerId ? partnerServesCustomer(partnerId, schema.customerName.id) : undefined,
  );
}

/**
 * The customers `userId` may choose for a project or task in the workspace, by name. With `partnerId`
 * (a partner's project), only that partner's customers.
 */
export async function listCustomerNames(userId: string, workspaceId: string, partnerId: string | null = null) {
  return withAccess(userId, async () =>
    getDb()
      .select({ id: schema.customerName.id, name: schema.customerName.name })
      .from(schema.customerName)
      .where(customerChoices(workspaceId, partnerId))
      .orderBy(asc(schema.customerName.name), asc(schema.customerName.id)),
  );
}

/**
 * Whether `organizationId` is one of the choices `listCustomerNames` offers the acting user: the server
 * check for project and task writes, so a tampered id (another workspace's, another partner's, made up)
 * is refused the same way. Inside the action's `withAccess`.
 */
export async function isCustomerChoice(workspaceId: string, partnerId: string | null, organizationId: string) {
  const [row] = await getDb()
    .select({ id: schema.customerName.id })
    .from(schema.customerName)
    .where(and(eq(schema.customerName.id, organizationId), customerChoices(workspaceId, partnerId)));
  return row !== undefined;
}
