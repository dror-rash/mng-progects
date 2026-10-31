import { and, asc, eq, getDb, isNull, notExists, schema, sql, withAccess } from "@repo/db";

import { canSeeCustomer, hasWorkspaceRole } from "@/features/access/predicates";

/** A workspace's partners (not deleted), by name, for admins and auditors. */
function workspacePartners(userId: string, workspaceId: string) {
  return and(
    eq(schema.partner.workspaceId, workspaceId),
    isNull(schema.partner.deletedAt),
    hasWorkspaceRole(userId, schema.partner.workspaceId, ["admin", "auditor"]),
  );
}

/** The workspace's partners with how many users and customers each has, by name (admins and auditors). */
export async function listPartners(userId: string, workspaceId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({
        id: schema.partner.id,
        name: schema.partner.name,
        // Plain SQL: Drizzle leaves columns unqualified in select fields, which a correlated subquery can't use.
        userCount: sql<number>`(select count(*) from workspace_member m where m.partner_id = partner.id)::int`,
        customerCount: sql<number>`(select count(*) from customer_partner cp
          join organization o on o.id = cp.organization_id
          where cp.partner_id = partner.id and o.deleted_at is null)::int`,
      })
      .from(schema.partner)
      .where(workspacePartners(userId, workspaceId))
      .orderBy(asc(schema.partner.name), asc(schema.partner.id)),
  );
}

/**
 * The partner (not deleted) with its customers and users, only if `userId` is an admin or auditor of its
 * workspace; `canChange` for admins, who also get the customers they can still assign.
 */
export async function getPartnerForUser(userId: string, partnerId: string) {
  return withAccess(userId, async () => {
    const db = getDb();
    const [partner] = await db
      .select({
        id: schema.partner.id,
        name: schema.partner.name,
        workspaceId: schema.partner.workspaceId,
        canChange: hasWorkspaceRole(userId, schema.partner.workspaceId, ["admin"]),
      })
      .from(schema.partner)
      .where(
        and(
          eq(schema.partner.id, partnerId),
          isNull(schema.partner.deletedAt),
          hasWorkspaceRole(userId, schema.partner.workspaceId, ["admin", "auditor"]),
        ),
      );
    if (!partner) return null;

    const customer = { id: schema.organization.id, name: schema.organization.name };
    // One after another: they share the transaction's connection.
    const customers = await db
      .select(customer)
      .from(schema.customerPartner)
      .innerJoin(schema.organization, eq(schema.organization.id, schema.customerPartner.organizationId))
      .where(and(eq(schema.customerPartner.partnerId, partner.id), isNull(schema.organization.deletedAt)))
      .orderBy(asc(schema.organization.name));
    const users = await db
      .select({ userId: schema.user.id, name: schema.user.name, email: schema.user.email })
      .from(schema.workspaceMember)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMember.userId))
      .where(eq(schema.workspaceMember.partnerId, partner.id))
      .orderBy(asc(schema.workspaceMember.joinedAt));
    const alreadyAssigned = db
      .select({ n: sql`1` })
      .from(schema.customerPartner)
      .where(
        and(
          eq(schema.customerPartner.partnerId, partner.id),
          eq(schema.customerPartner.organizationId, schema.organization.id),
        ),
      );
    const assignable = partner.canChange
      ? await db
          .select(customer)
          .from(schema.organization)
          .where(
            and(
              eq(schema.organization.workspaceId, partner.workspaceId),
              eq(schema.organization.kind, "customer"),
              isNull(schema.organization.deletedAt),
              canSeeCustomer(userId, schema.organization.id),
              notExists(alreadyAssigned),
            ),
          )
          .orderBy(asc(schema.organization.name))
      : [];
    return { ...partner, customers, users, assignable };
  });
}
