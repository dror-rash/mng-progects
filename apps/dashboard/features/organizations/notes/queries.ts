import { desc, eq, getDb, getTableColumns, schema } from "@repo/db";

/** Newest first. */
export async function listNotes(organizationId: string) {
  return getDb()
    .select({ ...getTableColumns(schema.organizationNote), authorName: schema.user.name })
    .from(schema.organizationNote)
    .leftJoin(schema.user, eq(schema.organizationNote.authorId, schema.user.id))
    .where(eq(schema.organizationNote.organizationId, organizationId))
    .orderBy(desc(schema.organizationNote.createdAt));
}
