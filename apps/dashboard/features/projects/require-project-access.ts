import { requireProjectChange, requireProjectWork } from "@/features/access/require-change";

import { getProjectForUser } from "./queries";

/**
 * For server actions that write a project or its tasks: the project with this id if `userId` can change
 * it (`can_change_project`, ADR-0006), or throws the same error as for a missing one. Call it inside the
 * action's `withAccess(userId, …)`.
 */
export async function requireProjectAccess(userId: string, projectId: string) {
  await requireProjectChange(userId, projectId);
  return requireVisibleProject(userId, projectId);
}

/**
 * For server actions that add, edit or move a project's tasks: the project if `userId` can work on it
 * (`can_work_on_project`: also its crew's workers, task 056), or the same error as for a missing one.
 */
export async function requireProjectWorkAccess(userId: string, projectId: string) {
  await requireProjectWork(userId, projectId);
  return requireVisibleProject(userId, projectId);
}

async function requireVisibleProject(userId: string, projectId: string) {
  const project = await getProjectForUser(userId, projectId);
  if (!project) {
    throw new Error("Not found");
  }
  return project;
}
