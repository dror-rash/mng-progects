"use server";

import { and, eq, getDb, isNotNull, schema, sql, withAccess } from "@repo/db";
import { revalidatePath } from "next/cache";

import { hasWorkspaceRole } from "@/features/access/predicates";
import { requireActionSession } from "@/features/auth/require-session";
import { type FormState, invalid } from "@/features/forms/form-state";

import { type DeletedKind, parseDeletedKind } from "./deleted-kind";

// Restoring from the Deleted page (design rule 8): admins only. Anyone else, an unknown kind, a made-up id
// and an item that isn't deleted all get the same "Not found". An item whose parent is still deleted
// can't come back before it (a task without its project, a contact or note without its customer).

const NOT_FOUND = "Not found";

/** Clears `deleted_at` / `deleted_by` (the shared columns of every soft-deletable table). */
const restored = { deletedAt: null, deletedBy: null };

/**
 * Restores the deleted item of `kind` with `id` as `userId`, inside their `withAccess`: an error to show
 * when its parent is still deleted, null when restored; throws when it can't be found for an admin.
 */
async function restore(userId: string, kind: DeletedKind, id: string): Promise<string | null> {
  const db = getDb();
  const { project, task, organization, organizationContact: contact, organizationNote: note, partner } = schema;
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
      const updated = await db
        .update(organization)
        .set(restored)
        .where(
          and(eq(organization.id, id), eq(organization.kind, "customer"), isNotNull(organization.deletedAt), admin(organization.workspaceId)),
        )
        .returning({ id: organization.id });
      if (updated.length === 0) throw new Error(NOT_FOUND);
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
