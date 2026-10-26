import { and, asc, eq, getDb, schema, sql } from "@repo/db";

import type { OrganizationKind, OrganizationStatus } from "./organization-kinds";
import { distinctTags } from "./tag-list";

/** Returns the organization only if `ownerId` owns it and it is of `kind`. */
export async function getOwnedOrganization(ownerId: string, id: string, kind: OrganizationKind) {
  const [organization] = await getDb()
    .select()
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, id),
        eq(schema.organization.ownerId, ownerId),
        eq(schema.organization.kind, kind),
      ),
    );
  return organization ?? null;
}

export async function listOrganizations(
  ownerId: string,
  kind: OrganizationKind,
  filter: { status?: OrganizationStatus; tag?: string } = {},
) {
  return getDb()
    .select()
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.ownerId, ownerId),
        eq(schema.organization.kind, kind),
        filter.status ? eq(schema.organization.status, filter.status) : undefined,
        // Tags match without regard to case, the same way the tag list merges them.
        filter.tag
          ? sql`exists (select 1 from unnest(${schema.organization.tags}) as t where lower(t) = lower(${filter.tag}))`
          : undefined,
      ),
    )
    .orderBy(asc(schema.organization.name));
}

/** Every tag used by the owner's organizations of `kind`; see `distinctTags` (oldest spelling wins). */
export async function listOrganizationTags(ownerId: string, kind: OrganizationKind) {
  const rows = await getDb()
    .select({ tags: schema.organization.tags })
    .from(schema.organization)
    .where(and(eq(schema.organization.ownerId, ownerId), eq(schema.organization.kind, kind)))
    .orderBy(asc(schema.organization.createdAt));
  return distinctTags(rows.map((r) => r.tags));
}

/**
 * Whether `ownerId` may link a project or task to `organizationId`: "no customer" (null/undefined)
 * is always allowed; otherwise it must be one of the owner's customers. The only guard against
 * linking another user's customer by tampering with the form.
 */
export async function ownsCustomer(ownerId: string, organizationId: string | null | undefined) {
  return !organizationId || (await getOwnedOrganization(ownerId, organizationId, "customer")) !== null;
}
