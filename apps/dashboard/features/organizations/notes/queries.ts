import { desc, eq, getDb, schema } from "@repo/db";

/** Newest first. */
export async function listNotes(organizationId: string) {
  return getDb()
    .select()
    .from(schema.organizationNote)
    .where(eq(schema.organizationNote.organizationId, organizationId))
    .orderBy(desc(schema.organizationNote.createdAt));
}
