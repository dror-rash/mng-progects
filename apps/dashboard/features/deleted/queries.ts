import { and, eq, getDb, isNotNull, schema, withAccess } from "@repo/db";

import { hasWorkspaceRole } from "@/features/access/predicates";

import type { DeletedKind } from "./deleted-kind";
import { noteName } from "./note-name";

/** One row of the Deleted page: what it is, where it was (a task's project; a contact's or note's customer), who deleted it and when. */
export type DeletedItem = {
  kind: DeletedKind;
  id: string;
  name: string;
  where: string | null;
  deletedAt: Date;
  deletedByName: string | null;
};

const deletedBy = { deletedByName: schema.user.name };

/**
 * The workspace's items that were deleted themselves (not the tasks hidden with a deleted project, or the
 * contacts and notes of a deleted customer), newest deletion first. Admins and auditors only: for anyone
 * else, the list is empty.
 */
export async function listDeleted(userId: string, workspaceId: string): Promise<DeletedItem[]> {
  const seesDeleted = (workspace: Parameters<typeof hasWorkspaceRole>[1]) => hasWorkspaceRole(userId, workspace, ["admin", "auditor"]);
  const { project, task, organization, organizationContact: contact, organizationNote: note, partner, user } = schema;

  return withAccess(userId, async () => {
    const db = getDb();
    // One after another: they share the transaction's connection.
    const projects = await db
      .select({ id: project.id, name: project.name, deletedAt: project.deletedAt, ...deletedBy })
      .from(project)
      .leftJoin(user, eq(user.id, project.deletedBy))
      .where(and(eq(project.workspaceId, workspaceId), isNotNull(project.deletedAt), seesDeleted(project.workspaceId)));
    const tasks = await db
      .select({ id: task.id, name: task.title, where: project.name, deletedAt: task.deletedAt, ...deletedBy })
      .from(task)
      .innerJoin(project, eq(project.id, task.projectId))
      .leftJoin(user, eq(user.id, task.deletedBy))
      .where(and(eq(project.workspaceId, workspaceId), isNotNull(task.deletedAt), seesDeleted(project.workspaceId)));
    const customers = await db
      .select({ id: organization.id, name: organization.name, deletedAt: organization.deletedAt, ...deletedBy })
      .from(organization)
      .leftJoin(user, eq(user.id, organization.deletedBy))
      .where(
        and(
          eq(organization.workspaceId, workspaceId),
          eq(organization.kind, "customer"),
          isNotNull(organization.deletedAt),
          seesDeleted(organization.workspaceId),
        ),
      );
    const contacts = await db
      .select({ id: contact.id, name: contact.name, where: organization.name, deletedAt: contact.deletedAt, ...deletedBy })
      .from(contact)
      .innerJoin(organization, eq(organization.id, contact.organizationId))
      .leftJoin(user, eq(user.id, contact.deletedBy))
      .where(and(eq(organization.workspaceId, workspaceId), isNotNull(contact.deletedAt), seesDeleted(organization.workspaceId)));
    const notes = await db
      .select({ id: note.id, body: note.body, where: organization.name, deletedAt: note.deletedAt, ...deletedBy })
      .from(note)
      .innerJoin(organization, eq(organization.id, note.organizationId))
      .leftJoin(user, eq(user.id, note.deletedBy))
      .where(and(eq(organization.workspaceId, workspaceId), isNotNull(note.deletedAt), seesDeleted(organization.workspaceId)));
    const partners = await db
      .select({ id: partner.id, name: partner.name, deletedAt: partner.deletedAt, ...deletedBy })
      .from(partner)
      .leftJoin(user, eq(user.id, partner.deletedBy))
      .where(and(eq(partner.workspaceId, workspaceId), isNotNull(partner.deletedAt), seesDeleted(partner.workspaceId)));

    const items: DeletedItem[] = [
      ...projects.map((r) => ({ kind: "project" as const, where: null, ...r })),
      ...tasks.map((r) => ({ kind: "task" as const, ...r })),
      ...customers.map((r) => ({ kind: "customer" as const, where: null, ...r })),
      ...contacts.map((r) => ({ kind: "contact" as const, ...r })),
      ...notes.map(({ body, ...r }) => ({ kind: "note" as const, name: noteName(body), ...r })),
      ...partners.map((r) => ({ kind: "partner" as const, where: null, ...r })),
    ].map((item) => ({ ...item, deletedAt: item.deletedAt! }));
    return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime() || a.name.localeCompare(b.name));
  });
}
