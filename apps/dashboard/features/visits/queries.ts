import { and, asc, desc, eq, getDb, isNull, schema, sql, withAccess } from "@repo/db";

// Site visits (task 058). Row-level security shows a project's visits to whoever sees the project; these
// filter deleted ones. Callers check the project first.

const author = schema.user;

/** Who was there, by name, as one string ("Avi, Rina"): for lists. */
const memberNames = sql<string>`coalesce((
  select string_agg(u.name, ', ' order by u.name)
  from site_visit_member m join "user" u on u.id = m.user_id
  where m.visit_id = ${schema.siteVisit.id}
), '')`;

/** The project's visits (not deleted), newest first by day, then by when they were recorded. */
export async function listProjectVisits(userId: string, projectId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({
        id: schema.siteVisit.id,
        visitedOn: schema.siteVisit.visitedOn,
        notes: schema.siteVisit.notes,
        authorName: author.name,
        memberNames,
      })
      .from(schema.siteVisit)
      .leftJoin(author, eq(author.id, schema.siteVisit.createdBy))
      .where(and(eq(schema.siteVisit.projectId, projectId), isNull(schema.siteVisit.deletedAt)))
      .orderBy(desc(schema.siteVisit.visitedOn), desc(schema.siteVisit.createdAt), asc(schema.siteVisit.id)),
  );
}

/**
 * The visit, only if it is one of the project's (not deleted) and `userId` sees it, with its author's
 * name, whether they may change it (`can_change_visit`: its author or an admin) and who was there.
 */
export async function getProjectVisit(userId: string, projectId: string, visitId: string) {
  return withAccess(userId, async () => {
    const db = getDb();
    const [visit] = await db
      .select({
        id: schema.siteVisit.id,
        projectId: schema.siteVisit.projectId,
        visitedOn: schema.siteVisit.visitedOn,
        notes: schema.siteVisit.notes,
        authorName: author.name,
        canChange: sql<boolean>`can_change_visit(${userId}, ${schema.siteVisit.id})`,
      })
      .from(schema.siteVisit)
      .leftJoin(author, eq(author.id, schema.siteVisit.createdBy))
      .where(and(eq(schema.siteVisit.id, visitId), eq(schema.siteVisit.projectId, projectId), isNull(schema.siteVisit.deletedAt)));
    if (!visit) return null;
    const members = await db
      .select({ userId: schema.siteVisitMember.userId, name: schema.user.name })
      .from(schema.siteVisitMember)
      .innerJoin(schema.user, eq(schema.user.id, schema.siteVisitMember.userId))
      .where(eq(schema.siteVisitMember.visitId, visit.id))
      .orderBy(asc(schema.user.name));
    return { ...visit, members };
  });
}
