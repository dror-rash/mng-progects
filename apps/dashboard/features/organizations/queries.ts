import { alias, and, type AnyColumn, asc, eq, getDb, getTableColumns, isNull, ne, schema, sql, withAccess } from "@repo/db";

import { canChangeCustomer, canSeeCustomer, canSeeProject } from "@/features/access/predicates";

import type { OrganizationKind, OrganizationStatus } from "./organization-kinds";
import { distinctTags } from "./tag-list";

/** The parent company, joined as `parent_organization` (task 053). */
const parent = alias(schema.organization, "parent_organization");

/**
 * Whether the organization has sub-companies, deleted ones too: the trigger counts them, so such a company
 * can't be given a parent (task 053).
 */
const hasSubCompanies = sql<boolean>`exists (select 1 from organization c where c.parent_id = ${schema.organization.id})`;

/**
 * The organization with whether `userId` may change it, only if it is of `kind`, not deleted, and they can
 * see it (admins and auditors, ADR-0006).
 */
export async function getOrganizationForUser(userId: string, id: string, kind: OrganizationKind) {
  const [organization] = await withAccess(userId, () =>
    getDb()
      .select({
        ...getTableColumns(schema.organization),
        canChange: canChangeCustomer(userId, schema.organization.id),
        parentName: parent.name,
        hasSubCompanies,
      })
      .from(schema.organization)
      .leftJoin(parent, eq(parent.id, schema.organization.parentId))
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
      .select({
        ...getTableColumns(schema.organization),
        primaryContactName: schema.organizationContact.name,
        parentName: parent.name,
      })
      .from(schema.organization)
      .leftJoin(parent, eq(parent.id, schema.organization.parentId))
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

/** The sub-companies of `parentId` that `userId` can see (not deleted), by name, with their primary contact's name. */
export async function listSubCompanies(userId: string, workspaceId: string, parentId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({
        id: schema.organization.id,
        name: schema.organization.name,
        status: schema.organization.status,
        primaryContactName: schema.organizationContact.name,
      })
      .from(schema.organization)
      .leftJoin(
        schema.organizationContact,
        and(
          eq(schema.organizationContact.id, schema.organization.primaryContactId),
          isNull(schema.organizationContact.deletedAt),
        ),
      )
      .where(and(visibleOrganizations(userId, workspaceId, "customer"), eq(schema.organization.parentId, parentId)))
      .orderBy(asc(schema.organization.name)),
  );
}

/**
 * The names of the projects (not deleted; canceled ones too) for the customer `organizationId` or at one of
 * its sites, by name: a customer or sub-company in use can't be deleted (task 071). Inside the caller's
 * `withAccess` or on its own.
 */
export async function listProjectsOfCustomer(userId: string, organizationId: string) {
  const rows = await withAccess(userId, async () =>
    getDb()
      .select({ name: schema.project.name })
      .from(schema.project)
      .where(
        and(
          isNull(schema.project.deletedAt),
          canSeeProject(userId, schema.project.id),
          sql`(${schema.project.organizationId} = ${organizationId}
            or ${schema.project.siteId} in (select ${schema.site.id} from ${schema.site} where ${schema.site.organizationId} = ${organizationId}))`,
        ),
      )
      .orderBy(asc(schema.project.name), asc(schema.project.id)),
  );
  return rows.map((r) => r.name);
}

/** The companies `userId` may choose as "Part of": top-level customers they can see, not deleted, not `excludeId`. */
function parentChoices(userId: string, workspaceId: string, excludeId: string | null) {
  return and(
    visibleOrganizations(userId, workspaceId, "customer"),
    isNull(schema.organization.parentId),
    excludeId ? ne(schema.organization.id, excludeId) : undefined,
  );
}

/** The "Part of" choices for a new customer, or for `excludeId` when editing it (task 053). */
export async function listParentChoices(userId: string, workspaceId: string, excludeId: string | null = null) {
  return withAccess(userId, async () =>
    getDb()
      .select({ id: schema.organization.id, name: schema.organization.name })
      .from(schema.organization)
      .where(parentChoices(userId, workspaceId, excludeId))
      .orderBy(asc(schema.organization.name)),
  );
}

/**
 * Whether `parentId` is one of the choices `listParentChoices` offers: the server check for the customer
 * actions, so another workspace's company, a sub-company, a deleted or made-up id are all refused the same
 * way. Inside the action's `withAccess`.
 */
export async function isParentChoice(userId: string, workspaceId: string, parentId: string, excludeId: string | null = null) {
  const [row] = await getDb()
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(and(eq(schema.organization.id, parentId), parentChoices(userId, workspaceId, excludeId)));
  return row !== undefined;
}

/** SQL condition: `column` is `organizationId` or one of its sub-companies. For lists on a parent's page (task 053). */
export function inCompanyGroup(column: AnyColumn, organizationId: string) {
  return sql`(${column} = ${organizationId} or ${column} in (select o.id from organization o where o.parent_id = ${organizationId}))`;
}
