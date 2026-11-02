"use server";

import { alias, and, eq, getDb, isNotNull, schema, sql, withAccess } from "@repo/db";
import { revalidatePath } from "next/cache";

import { hasWorkspaceRole } from "@/features/access/predicates";
import { requireActionSession } from "@/features/auth/require-session";
import { type FormState, invalid } from "@/features/forms/form-state";

import { type DeletedKind, parseDeletedKind } from "./deleted-kind";

// Restoring from the Deleted page (design rule 8): admins only. Anyone else, an unknown kind, a made-up id
// and an item that isn't deleted all get the same "Not found". An item whose parent is still deleted
// can't come back before it (a task without its project, a contact or note without its customer, a
// sub-company without its parent, a site without its customer, a site contact without its site, a visit
// without its project).

const NOT_FOUND = "Not found";

/** Clears `deleted_at` / `deleted_by` (the shared columns of every soft-deletable table). */
const restored = { deletedAt: null, deletedBy: null };

/**
 * Restores the deleted item of `kind` with `id` as `userId`, inside their `withAccess`: an error to show
 * when its parent is still deleted, null when restored; throws when it can't be found for an admin.
 */
async function restore(userId: string, kind: DeletedKind, id: string): Promise<string | null> {
  const db = getDb();
  const { project, task, organization, organizationContact: contact, organizationNote: note, partner, site, siteContact, siteVisit: visit } = schema;
  const admin = (workspace: Parameters<typeof hasWorkspaceRole>[1]) => hasWorkspaceRole(userId, workspace, ["admin"]);

  switch (kind) {
    case "project": {
      // Through `restore_project`: nobody may update a deleted project under row-level security.
      const { rows } = await db.execute<{ restored: boolean }>(sql`select restore_project(${id}) as restored`);
      if (rows[0]?.restored !== true) throw new Error(NOT_FOUND);
      return null;
    }
    case "task": {
      const [row] = await db
        .select({ projectDeletedAt: project.deletedAt })
        .from(task)
        .innerJoin(project, eq(project.id, task.projectId))
        .where(and(eq(task.id, id), isNotNull(task.deletedAt), admin(project.workspaceId)));
      if (!row) throw new Error(NOT_FOUND);
      if (row.projectDeletedAt) return "Restore its project first";
      await db.update(task).set(restored).where(eq(task.id, id));
      return null;
    }
    case "customer": {
      // A sub-company can't come back before its parent (task 053).
      const parentOrganization = alias(organization, "parent_organization");
      const [row] = await db
        .select({ parentDeletedAt: parentOrganization.deletedAt })
        .from(organization)
        .leftJoin(parentOrganization, eq(parentOrganization.id, organization.parentId))
        .where(
          and(eq(organization.id, id), eq(organization.kind, "customer"), isNotNull(organization.deletedAt), admin(organization.workspaceId)),
        );
      if (!row) throw new Error(NOT_FOUND);
      if (row.parentDeletedAt) return "Restore its parent first";
      await db.update(organization).set(restored).where(eq(organization.id, id));
      return null;
    }
    case "contact":
    case "note": {
      const table = kind === "contact" ? contact : note;
      const [row] = await db
        .select({ customerDeletedAt: organization.deletedAt })
        .from(table)
        .innerJoin(organization, eq(organization.id, table.organizationId))
        .where(and(eq(table.id, id), isNotNull(table.deletedAt), admin(organization.workspaceId)));
      if (!row) throw new Error(NOT_FOUND);
      if (row.customerDeletedAt) return "Restore its customer first";
      await db.update(table).set(restored).where(eq(table.id, id));
      return null;
    }
    case "site": {
      // A site can't come back before its customer (task 054).
      const [row] = await db
        .select({ customerDeletedAt: organization.deletedAt })
        .from(site)
        .innerJoin(organization, eq(organization.id, site.organizationId))
        .where(and(eq(site.id, id), isNotNull(site.deletedAt), admin(site.workspaceId)));
      if (!row) throw new Error(NOT_FOUND);
      if (row.customerDeletedAt) return "Restore its customer first";
      await db.update(site).set(restored).where(eq(site.id, id));
      return null;
    }
    case "site_contact": {
      const [row] = await db
        .select({ siteDeletedAt: site.deletedAt })
        .from(siteContact)
        .innerJoin(site, eq(site.id, siteContact.siteId))
        .where(and(eq(siteContact.id, id), isNotNull(siteContact.deletedAt), admin(site.workspaceId)));
      if (!row) throw new Error(NOT_FOUND);
      if (row.siteDeletedAt) return "Restore its site first";
      await db.update(siteContact).set(restored).where(eq(siteContact.id, id));
      return null;
    }
    case "visit": {
      // A visit comes back only on a project that isn't deleted (task 058).
      const [row] = await db
        .select({ projectDeletedAt: project.deletedAt })
        .from(visit)
        .innerJoin(project, eq(project.id, visit.projectId))
        .where(and(eq(visit.id, id), isNotNull(visit.deletedAt), admin(project.workspaceId)));
      if (!row) throw new Error(NOT_FOUND);
      if (row.projectDeletedAt) return "Restore its project first";
      await db.update(visit).set(restored).where(eq(visit.id, id));
      return null;
    }
    case "partner": {
      const updated = await db
        .update(partner)
        .set(restored)
        .where(and(eq(partner.id, id), isNotNull(partner.deletedAt), admin(partner.workspaceId)))
        .returning({ id: partner.id });
      if (updated.length === 0) throw new Error(NOT_FOUND);
      return null;
    }
  }
}

/** The Restore button on the Deleted page: posts `kind` and `id`. */
export async function restoreAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireActionSession();
  const kind = parseDeletedKind(formData.get("kind"));
  if (!kind) {
    throw new Error(NOT_FOUND);
  }
  const id = String(formData.get("id") ?? "");
  const error = await withAccess(session.user.id, () => restore(session.user.id, kind, id));
  if (error) {
    return invalid(error, formData);
  }
  // A restored item shows up again on lists, record pages and in names everywhere in the zone.
  revalidatePath("/", "layout");
  return {};
}
