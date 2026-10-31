import { and, desc, eq, getDb, getTableColumns, isNull, schema } from "@repo/db";

/** Newest first. */
export async function listNotes(organizationId: string) {
  return getDb()
    .select({ ...getTableColumns(schema.organizationNote), authorName: schema.user.name })
    .from(schema.organizationNote)
    .leftJoin(schema.user, eq(schema.organizationNote.authorId, schema.user.id))
    .where(and(eq(schema.organizationNote.organizationId, organizationId), isNull(schema.organizationNote.deletedAt)))
    .orderBy(desc(schema.organizationNote.createdAt));
}
