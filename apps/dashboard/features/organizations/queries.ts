import { and, asc, eq, getDb, schema, sql } from "@repo/db";

import { visibleTo } from "@/features/workspaces/access";

import type { OrganizationKind, OrganizationStatus } from "./organization-kinds";
import { distinctTags } from "./tag-list";

/** The organization, only if it is of `kind` and `userId` is a member of its workspace (ADR-0005). */
export async function getOrganizationForUser(userId: string, id: string, kind: OrganizationKind) {
  const [organization] = await getDb()
    .select()
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, id),
        eq(schema.organization.kind, kind),
        visibleTo(userId, schema.organization.workspaceId),
      ),
    );
  return organization ?? null;
}

export async function listOrganizations(
  workspaceId: string,
  kind: OrganizationKind,
  filter: { status?: OrganizationStatus; tag?: string } = {},
) {
  return getDb()
    .select()
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.workspaceId, workspaceId),
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

/** Every tag used by the workspace's organizations of `kind`; see `distinctTags` (oldest spelling wins). */
export async function listOrganizationTags(workspaceId: string, kind: OrganizationKind) {
  const rows = await getDb()
    .select({ tags: schema.organization.tags })
    .from(schema.organization)
    .where(and(eq(schema.organization.workspaceId, workspaceId), eq(schema.organization.kind, kind)))
    .orderBy(asc(schema.organization.createdAt));
  return distinctTags(rows.map((r) => r.tags));
}

/**
 * Whether a project or task in `workspaceId` may be linked to `organizationId`: "no customer"
 * (null/undefined) is always allowed; otherwise it must be a customer in the same workspace. The only
 * guard against linking another workspace's customer by tampering with the form.
 */
export async function customerInWorkspace(workspaceId: string, organizationId: string | null | undefined) {
  if (!organizationId) return true;
  const [row] = await getDb()
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(
      and(
        eq(schema.organization.id, organizationId),
        eq(schema.organization.workspaceId, workspaceId),
        eq(schema.organization.kind, "customer"),
      ),
    );
  return row !== undefined;
}
