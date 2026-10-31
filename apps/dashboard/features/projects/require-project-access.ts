import { getSession } from "@repo/auth/server";

import { requireProjectChange } from "@/features/access/require-change";

import { getProjectForUser } from "./queries";

/**
 * For server actions that write a project or its tasks: the project with this id if the signed-in user
 * can change it (`can_change_project`, ADR-0006), or throws the same error as for a missing one.
 */
export async function requireProjectAccess(projectId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  await requireProjectChange(session.user.id, projectId);
  const project = await getProjectForUser(session.user.id, projectId);
  if (!project) {
    throw new Error("Not found");
  }
  return project;
}
