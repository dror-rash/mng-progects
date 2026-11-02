import { and, desc, eq, getDb, isNotNull, isNull, or, schema, sql, withAccess } from "@repo/db";

// Photos and files (task 059). Row-level security shows a project's confirmed attachments to whoever sees
// the project; these filter deleted ones. Callers check the project first.

const uploader = schema.user;

/** Not of a deleted visit (admins and auditors can still read those rows; the pages hide them). For queries joining `site_visit`. */
const visitNotDeleted = or(isNull(schema.attachment.visitId), isNull(schema.siteVisit.deletedAt));

const columns = {
  id: schema.attachment.id,
  kind: schema.attachment.kind,
  fileName: schema.attachment.fileName,
  sizeBytes: schema.attachment.sizeBytes,
  uploaderName: uploader.name,
  visitId: schema.attachment.visitId,
  visitedOn: schema.siteVisit.visitedOn,
  visitNotes: schema.siteVisit.notes,
};

/** The project's photos and files (confirmed, not deleted), newest first, with the visit each came from. */
export async function listProjectAttachments(userId: string, projectId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({ ...columns, canDelete: sql<boolean>`can_change_attachment(${userId}, ${schema.attachment.id})` })
      .from(schema.attachment)
      .leftJoin(uploader, eq(uploader.id, schema.attachment.uploadedBy))
      .leftJoin(schema.siteVisit, eq(schema.siteVisit.id, schema.attachment.visitId))
      .where(
        and(
          eq(schema.attachment.projectId, projectId),
          isNotNull(schema.attachment.confirmedAt),
          isNull(schema.attachment.deletedAt),
          visitNotDeleted,
        ),
      )
      .orderBy(desc(schema.attachment.createdAt), desc(schema.attachment.id)),
  );
}

/** One visit's photos and files, as `listProjectAttachments`. */
export async function listVisitAttachments(userId: string, projectId: string, visitId: string) {
  return (await listProjectAttachments(userId, projectId)).filter((a) => a.visitId === visitId);
}

/**
 * The attachment `userId` may open: confirmed, not deleted (nor its visit), of a project they see (row-level security).
 * Null for anything else, a made-up id included.
 */
export async function getOpenableAttachment(userId: string, attachmentId: string) {
  const [row] = await withAccess(userId, () =>
    getDb()
      .select({ storageKey: schema.attachment.storageKey, kind: schema.attachment.kind, fileName: schema.attachment.fileName })
      .from(schema.attachment)
      .leftJoin(schema.siteVisit, eq(schema.siteVisit.id, schema.attachment.visitId))
      .where(
        and(
          eq(schema.attachment.id, attachmentId),
          isNotNull(schema.attachment.confirmedAt),
          isNull(schema.attachment.deletedAt),
          visitNotDeleted,
        ),
      ),
  );
  return row ?? null;
}
