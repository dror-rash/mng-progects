import { and, arrayContains, asc, eq, getDb, schema } from "@repo/db";

import type { OrganizationKind, OrganizationStatus } from "./organization-kinds";

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
        filter.tag ? arrayContains(schema.organization.tags, [filter.tag]) : undefined,
      ),
    )
    .orderBy(asc(schema.organization.name));
}

/** Every tag used by the owner's organizations of `kind`, de-duplicated case-insensitively and sorted. */
export async function listOrganizationTags(ownerId: string, kind: OrganizationKind) {
  const rows = await getDb()
    .select({ tags: schema.organization.tags })
    .from(schema.organization)
    .where(and(eq(schema.organization.ownerId, ownerId), eq(schema.organization.kind, kind)));
  const byKey = new Map<string, string>();
  for (const tag of rows.flatMap((r) => r.tags)) {
    if (!byKey.has(tag.toLowerCase())) byKey.set(tag.toLowerCase(), tag);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
