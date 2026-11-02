import { and, asc, eq, getDb, notExists, schema, withAccess } from "@repo/db";

import type { WorkspaceRole } from "@/features/access/roles";

// A project's crew (task 056, ADR-0008): the workers who see the project and work on its tasks. Whoever
// sees the project sees its crew (row-level security); admins change it.

/** The project's crew, in the order they were added. Callers check the project first. */
export async function listCrew(userId: string, projectId: string) {
  return withAccess(userId, async () =>
    getDb()
      .select({ userId: schema.projectWorker.userId, name: schema.user.name })
      .from(schema.projectWorker)
      .innerJoin(schema.user, eq(schema.user.id, schema.projectWorker.userId))
      .where(eq(schema.projectWorker.projectId, projectId))
      .orderBy(asc(schema.projectWorker.createdAt), asc(schema.projectWorker.userId)),
  );
}

/** The workspace's workers who aren't on the project's crew yet, by name: the admin's "Worker to add" choices. */
export async function listCrewChoices(userId: string, project: { id: string; workspaceId: string }) {
  return withAccess(userId, async () =>
    getDb()
      .select({ userId: schema.workspaceMember.userId, name: schema.user.name })
      .from(schema.workspaceMember)
      .innerJoin(schema.user, eq(schema.user.id, schema.workspaceMember.userId))
      .where(
        and(
          eq(schema.workspaceMember.workspaceId, project.workspaceId),
          eq(schema.workspaceMember.role, "worker" satisfies WorkspaceRole),
          notExists(
            getDb()
              .select({ userId: schema.projectWorker.userId })
              .from(schema.projectWorker)
              .where(
                and(eq(schema.projectWorker.projectId, project.id), eq(schema.projectWorker.userId, schema.workspaceMember.userId)),
              ),
          ),
        ),
      )
      .orderBy(asc(schema.user.name), asc(schema.workspaceMember.userId)),
  );
}
