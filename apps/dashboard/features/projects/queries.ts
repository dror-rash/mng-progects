import { and, eq, getDb, schema } from "@repo/db";

/** Returns the project only if `ownerId` owns it, so callers can't leak another user's data. */
export async function getOwnedProject(ownerId: string, projectId: string) {
  const [project] = await getDb()
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, projectId), eq(schema.project.ownerId, ownerId)));
  return project ?? null;
}
