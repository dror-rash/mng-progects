import { and, desc, eq, getDb, getTableColumns, isNull, schema, withAccess } from "@repo/db";

/** The organization's notes `userId` can see, newest first. */
export async function listNotes(userId: string, organizationId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({ ...getTableColumns(schema.organizationNote), authorName: schema.user.name })
      .from(schema.organizationNote)
      .leftJoin(schema.user, eq(schema.organizationNote.authorId, schema.user.id))
      .where(and(eq(schema.organizationNote.organizationId, organizationId), isNull(schema.organizationNote.deletedAt)))
      .orderBy(desc(schema.organizationNote.createdAt)),
  );
}
