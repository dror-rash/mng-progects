import { getSession } from "@repo/auth/server";

import { getProjectForUser } from "./queries";

/** For server actions: the project with this id if the signed-in user is a member of its workspace, or throws. */
export async function requireProjectAccess(projectId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const project = await getProjectForUser(session.user.id, projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  return project;
}
