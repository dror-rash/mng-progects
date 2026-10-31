import { and, asc, eq, getDb, getTableColumns, isNull, schema, sql, withAccess } from "@repo/db";

import { canChangeCustomer, canSeeCustomer } from "@/features/access/predicates";

import type { OrganizationKind, OrganizationStatus } from "./organization-kinds";
import { distinctTags } from "./tag-list";

/**
 * The organization with whether `userId` may change it, only if it is of `kind`, not deleted, and they can
 * see it (admins and auditors, ADR-0006).
 */
export async function getOrganizationForUser(userId: string, id: string, kind: OrganizationKind) {
  const [organization] = await withAccess(userId, () =>
    getDb()
      .select({ ...getTableColumns(schema.organization), canChange: canChangeCustomer(userId, schema.organization.id) })
      .from(schema.organization)
      .where(
        and(
          eq(schema.organization.id, id),
          eq(schema.organization.kind, kind),
          isNull(schema.organization.deletedAt),
          canSeeCustomer(userId, schema.organization.id),
        ),
      ),
  );
  return organization ?? null;
}

/** The workspace's organizations of `kind` that `userId` can see in full (not deleted). */
function visibleOrganizations(userId: string, workspaceId: string, kind: OrganizationKind) {
  return and(
    eq(schema.organization.workspaceId, workspaceId),
    eq(schema.organization.kind, kind),
    isNull(schema.organization.deletedAt),
    canSeeCustomer(userId, schema.organization.id),
  );
}

/** The workspace's organizations of `kind` that `userId` can see, by name, each with its primary contact's name (task 038). */
export async function listOrganizations(
  userId: string,
  workspaceId: string,
  kind: OrganizationKind,
  filter: { status?: OrganizationStatus; tag?: string } = {},
) {
  return withAccess(userId, async () =>
    getDb()
      .select({ ...getTableColumns(schema.organization), primaryContactName: schema.organizationContact.name })
      .from(schema.organization)
      .leftJoin(
        schema.organizationContact,
        and(
          eq(schema.organizationContact.id, schema.organization.primaryContactId),
          isNull(schema.organizationContact.deletedAt),
        ),
      )
      .where(
        and(
          visibleOrganizations(userId, workspaceId, kind),
          filter.status ? eq(schema.organization.status, filter.status) : undefined,
          // Tags match without regard to case, the same way the tag list merges them.
          filter.tag
            ? sql`exists (select 1 from unnest(${schema.organization.tags}) as t where lower(t) = lower(${filter.tag}))`
            : undefined,
        ),
      )
      .orderBy(asc(schema.organization.name)),
  );
}

/** Every tag used by the organizations of `kind` that `userId` can see; see `distinctTags` (oldest spelling wins). */
export async function listOrganizationTags(userId: string, workspaceId: string, kind: OrganizationKind) {
  const rows = await withAccess(userId, () =>
    getDb()
      .select({ tags: schema.organization.tags })
      .from(schema.organization)
      .where(visibleOrganizations(userId, workspaceId, kind))
      .orderBy(asc(schema.organization.createdAt)),
  );
  return distinctTags(rows.map((r) => r.tags));
}
