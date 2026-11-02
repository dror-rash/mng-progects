import { alias, and, asc, eq, getDb, getTableColumns, isNull, schema, sql, withAccess } from "@repo/db";

import { canChangeSite, canSeeSite } from "@/features/access/predicates";
import { inCompanyGroup } from "@/features/organizations/queries";

// Sites (task 054, ADR-0008). A site shows only while it and its customer aren't deleted; the access
// functions decide who sees it at all (admins and auditors for now).

const customer = alias(schema.organization, "site_customer");
const parent = alias(schema.organization, "site_customer_parent");

/** The site's customer as "Parent › Sub-company", or its name. */
const customerLabel = sql<string>`case when ${parent.name} is null then ${customer.name} else ${parent.name} || ' › ' || ${customer.name} end`;

/** SQL condition: a site `userId` can see, with its customer not deleted. For queries joining `customer`. */
function visibleSites(userId: string) {
  return and(isNull(schema.site.deletedAt), isNull(customer.deletedAt), canSeeSite(userId, schema.site.id));
}

/** The site with its customer's label and whether `userId` may change it; null when they can't see it. */
export async function getSiteForUser(userId: string, siteId: string) {
  const [site] = await withAccess(userId, () =>
    getDb()
      .select({
        ...getTableColumns(schema.site),
        customerName: customerLabel,
        canChange: canChangeSite(userId, schema.site.id),
      })
      .from(schema.site)
      .innerJoin(customer, eq(customer.id, schema.site.organizationId))
      .leftJoin(parent, eq(parent.id, customer.parentId))
      .where(and(eq(schema.site.id, siteId), visibleSites(userId))),
  );
  return site ?? null;
}

/**
 * The sites of a customer and its sub-companies, by name, each with the sub-company it belongs to (null for
 * the customer's own). For the Sites section of a customer page.
 */
export async function listCustomerSites(userId: string, organizationId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({
        id: schema.site.id,
        name: schema.site.name,
        address: schema.site.address,
        subCompanyId: sql<string | null>`case when ${customer.id} = ${organizationId} then null else ${customer.id} end`,
        subCompanyName: sql<string | null>`case when ${customer.id} = ${organizationId} then null else ${customer.name} end`,
      })
      .from(schema.site)
      .innerJoin(customer, eq(customer.id, schema.site.organizationId))
      .where(and(inCompanyGroup(schema.site.organizationId, organizationId), visibleSites(userId)))
      .orderBy(asc(schema.site.name), asc(schema.site.id)),
  );
}

/** The site's contacts (not deleted), in the order they were added. Callers check the site first. */
export async function listSiteContacts(userId: string, siteId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select()
      .from(schema.siteContact)
      .where(and(eq(schema.siteContact.siteId, siteId), isNull(schema.siteContact.deletedAt)))
      .orderBy(asc(schema.siteContact.createdAt), asc(schema.siteContact.id)),
  );
}

/** The contact, only if it belongs to `siteId` and isn't deleted. Callers check the site first. */
export async function getSiteContact(userId: string, siteId: string, contactId: string) {
  const [contact] = await withAccess(userId, () =>
    getDb()
      .select()
      .from(schema.siteContact)
      .where(and(eq(schema.siteContact.id, contactId), eq(schema.siteContact.siteId, siteId), isNull(schema.siteContact.deletedAt))),
  );
  return contact ?? null;
}
