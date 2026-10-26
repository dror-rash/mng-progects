import { getSession } from "@repo/auth/server";

import { getOwnedProject } from "./queries";

/** For server actions: the signed-in user's project with this id, or throws. */
export async function requireOwnedProject(projectId: string) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const project = await getOwnedProject(session.user.id, projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  return project;
}
