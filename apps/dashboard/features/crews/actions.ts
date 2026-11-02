"use server";

import { and, eq, getDb, schema, withAccess } from "@repo/db";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/features/access/require-change";
import { requireActionSession } from "@/features/auth/require-session";
import { type FormState, invalid } from "@/features/forms/form-state";
import { getProjectForUser } from "@/features/projects/queries";
import { revalidateOverviews } from "@/features/projects/revalidate";

import { listCrewChoices } from "./queries";

// Crews (task 056): admins of the project's workspace add and remove its workers. Anyone else gets the
// not-found refusal. Removing a worker clears their tasks in the project (a database trigger).

/** The form's project (not deleted), if the user is an admin of its workspace; inside their `withAccess`. */
async function requireCrewProject(userId: string, formData: FormData) {
  const project = await getProjectForUser(userId, String(formData.get("projectId") ?? ""));
  if (!project) {
    throw new Error("Not found");
  }
  await requireAdmin(userId, project.workspaceId);
  return project;
}

function revalidateCrew(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-tasks");
  revalidateOverviews();
}

export async function addCrewMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireActionSession();
  const result = await withAccess(session.user.id, async () => {
    const project = await requireCrewProject(session.user.id, formData);
    const userId = String(formData.get("userId") ?? "");
    // Only the workers the select offers: another role, another workspace's, someone already on the crew.
    if (!(await listCrewChoices(session.user.id, project)).some((w) => w.userId === userId)) {
      return invalid("Choose a worker", formData, "userId");
    }
    await getDb()
      .insert(schema.projectWorker)
      .values({ projectId: project.id, userId, workspaceId: project.workspaceId, addedBy: session.user.id });
    return { projectId: project.id };
  });
  if (!("projectId" in result)) {
    return result;
  }
  revalidateCrew(result.projectId);
  return {};
}

export async function removeCrewMemberAction(formData: FormData) {
  const session = await requireActionSession();
  const projectId = await withAccess(session.user.id, async () => {
    const project = await requireCrewProject(session.user.id, formData);
    await getDb()
      .delete(schema.projectWorker)
      .where(and(eq(schema.projectWorker.projectId, project.id), eq(schema.projectWorker.userId, String(formData.get("userId") ?? ""))));
    return project.id;
  });
  revalidateCrew(projectId);
}
