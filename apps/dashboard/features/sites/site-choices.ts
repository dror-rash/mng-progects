import { and, asc, eq, getDb, or, schema, withAccess } from "@repo/db";

import { partnerServesCustomer } from "@/features/access/predicates";

import type { SiteChoice } from "./site-options";

// The sites a project may be at (task 055), read from the `site_choice` view: not deleted, of a customer
// whose name the user may see. Partners choose here without seeing the sites themselves.

/** The workspace's site choices; for a partner's project (`partnerId`), only sites of the partner's customers. */
function siteChoices(workspaceId: string, partnerId: string | null) {
  return and(
    eq(schema.siteChoice.workspaceId, workspaceId),
    partnerId ? partnerServesCustomer(partnerId, schema.siteChoice.organizationId) : undefined,
  );
}

/** Every site `userId` may choose for a project in the workspace, with its customer; the form filters by customer. */
export async function listSiteChoices(userId: string, workspaceId: string, partnerId: string | null = null): Promise<SiteChoice[]> {
  return withAccess(userId, async () =>
    getDb()
      .select({
        id: schema.siteChoice.id,
        name: schema.siteChoice.name,
        organizationId: schema.siteChoice.organizationId,
        customerParentId: schema.siteChoice.customerParentId,
        customerName: schema.siteChoice.customerName,
      })
      .from(schema.siteChoice)
      .where(siteChoices(workspaceId, partnerId))
      .orderBy(asc(schema.siteChoice.name), asc(schema.siteChoice.id)),
  );
}

/**
 * Whether `siteId` is one of the Site options for a project of `customerId` that `listSiteChoices` offers:
 * the server check, so another customer's site, another workspace's, a deleted one or a made-up id are all
 * refused the same way. Inside the action's `withAccess`.
 */
export async function isSiteChoice(workspaceId: string, partnerId: string | null, customerId: string, siteId: string) {
  const [row] = await getDb()
    .select({ id: schema.siteChoice.id })
    .from(schema.siteChoice)
    .where(
      and(
        eq(schema.siteChoice.id, siteId),
        or(eq(schema.siteChoice.organizationId, customerId), eq(schema.siteChoice.customerParentId, customerId)),
        siteChoices(workspaceId, partnerId),
      ),
    );
  return row !== undefined;
}
