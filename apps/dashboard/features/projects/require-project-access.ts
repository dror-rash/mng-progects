import { requireProjectChange } from "@/features/access/require-change";

import { getProjectForUser } from "./queries";

/**
 * For server actions that write a project or its tasks: the project with this id if `userId` can change
 * it (`can_change_project`, ADR-0006), or throws the same error as for a missing one. Call it inside the
 * action's `withAccess(userId, …)`.
 */
export async function requireProjectAccess(userId: string, projectId: string) {
  await requireProjectChange(userId, projectId);
  const project = await getProjectForUser(userId, projectId);
  if (!project) {
    throw new Error("Not found");
  }
  return project;
}
