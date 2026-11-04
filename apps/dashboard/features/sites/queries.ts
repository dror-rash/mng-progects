import { alias, and, asc, customerLabelOf, eq, getDb, getTableColumns, isNull, schema, withAccess } from "@repo/db";

import { canChangeSite, canSeeCustomer, canSeeSite } from "@/features/access/predicates";

// Sites (task 054, ADR-0008). A site shows only while it and its customer aren't deleted; the access
// functions decide who sees it at all: admins and auditors, and those who see a project at it (task 055).

const customer = alias(schema.organization, "site_customer");

/** SQL condition: a site `userId` can see, with its customer not deleted. For queries joining `customer`. */
function visibleSites(userId: string) {
  return and(isNull(schema.site.deletedAt), isNull(customer.deletedAt), canSeeSite(userId, schema.site.id));
}

/**
 * The site with its customer's label (null when the user may not see the customer's name) and whether
 * `userId` may change it and open its customer's page; null when they can't see the site. Partners can't
 * read `organization`, so the customer joins are left joins and the label comes from `customer_name`; a
 * partner sees no site of a deleted customer anyway (their projects go with it).
 */
export async function getSiteForUser(userId: string, siteId: string) {
  const [site] = await withAccess(userId, () =>
    getDb()
      .select({
        ...getTableColumns(schema.site),
        customerName: customerLabelOf(schema.site.organizationId, schema.site.workspaceId),
        canSeeCustomer: canSeeCustomer(userId, schema.site.organizationId),
        canChange: canChangeSite(userId, schema.site.id),
      })
      .from(schema.site)
      .leftJoin(customer, eq(customer.id, schema.site.organizationId))
      .where(
        and(
          eq(schema.site.id, siteId),
          isNull(schema.site.deletedAt),
          isNull(customer.deletedAt),
          canSeeSite(userId, schema.site.id),
        ),
      ),
  );
  return site ?? null;
}

/** The customer's own sites (not its sub-companies', task 072), by name. For the Sites section of a customer page. */
export async function listCustomerSites(userId: string, organizationId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({ id: schema.site.id, name: schema.site.name, address: schema.site.address })
      .from(schema.site)
      .innerJoin(customer, eq(customer.id, schema.site.organizationId))
      .where(and(eq(schema.site.organizationId, organizationId), visibleSites(userId)))
      .orderBy(asc(schema.site.name), asc(schema.site.id)),
  );
}

/** Whether `userId` can open the site's page: `getSiteForUser`'s check, without the details. */
export async function canSeeSiteById(userId: string, siteId: string) {
  const [row] = await withAccess(userId, () =>
    getDb()
      .select({ id: schema.site.id })
      .from(schema.site)
      .leftJoin(customer, eq(customer.id, schema.site.organizationId))
      .where(and(eq(schema.site.id, siteId), visibleSites(userId))),
  );
  return row !== undefined;
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

/**
 * The names of the projects (not deleted; canceled ones too, which keep their site) at the site, by name:
 * a site in use can't be deleted (task 055). Inside the caller's `withAccess` or on its own.
 */
export async function listProjectsAtSite(userId: string, siteId: string) {
  const rows = await withAccess(userId, async () =>
    getDb()
      .select({ name: schema.project.name })
      .from(schema.project)
      .where(and(eq(schema.project.siteId, siteId), isNull(schema.project.deletedAt)))
      .orderBy(asc(schema.project.name), asc(schema.project.id)),
  );
  return rows.map((r) => r.name);
}

/**
 * The names of `parentId`'s projects (not deleted) at the sites of its sub-company `subCompanyId`, by name:
 * the sub-company can't leave its parent while there are any (task 055).
 */
export async function listParentProjectsAtSitesOf(userId: string, subCompanyId: string, parentId: string) {
  const rows = await withAccess(userId, async () =>
    getDb()
      .select({ name: schema.project.name })
      .from(schema.project)
      .innerJoin(schema.site, eq(schema.site.id, schema.project.siteId))
      .where(
        and(
          eq(schema.site.organizationId, subCompanyId),
          eq(schema.project.organizationId, parentId),
          isNull(schema.project.deletedAt),
        ),
      )
      .orderBy(asc(schema.project.name), asc(schema.project.id)),
  );
  return rows.map((r) => r.name);
}
