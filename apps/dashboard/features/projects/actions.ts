"use server";

import { getSession } from "@repo/auth/server";
import { eq, getDb, schema } from "@repo/db";
import { redirect } from "next/navigation";

import { parseProjectInput } from "./project-input";
import { getOwnedProject } from "./queries";

/** Every project action re-checks that the signed-in user owns the project. */
async function requireOwnedProject(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const project = await getOwnedProject(session.user.id, String(formData.get("projectId") ?? ""));
  if (!project) {
    throw new Error("Project not found");
  }
  return project;
}

export async function updateProjectAction(formData: FormData) {
  const project = await requireOwnedProject(formData);
  const input = parseProjectInput(formData);
  if (!input.ok) {
    throw new Error(input.error);
  }

  await getDb()
    .update(schema.project)
    .set({ ...input.value, updatedAt: new Date() })
    .where(eq(schema.project.id, project.id));
  redirect(`/projects/${project.id}`);
}

/** Tasks go with the project (`onDelete: "cascade"`). */
export async function deleteProjectAction(formData: FormData) {
  const project = await requireOwnedProject(formData);

  await getDb().delete(schema.project).where(eq(schema.project.id, project.id));
  redirect("/");
}
