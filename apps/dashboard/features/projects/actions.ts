"use server";

import { getSession } from "@repo/auth/server";
import { eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseProjectInput } from "./project-input";
import { requireOwnedProject } from "./require-owned-project";

export async function createProjectAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const input = parseProjectInput(formData);
  if (!input.ok) {
    throw new Error(input.error);
  }

  await getDb().insert(schema.project).values({ id: crypto.randomUUID(), ...input.value, ownerId: session.user.id });
  // Paths are relative to the basePath: "/" is /dashboard.
  revalidatePath("/");
  revalidatePath("/projects");
}

export async function updateProjectAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const input = parseProjectInput(formData);
  if (!input.ok) {
    throw new Error(input.error);
  }

  await getDb()
    .update(schema.project)
    .set({ ...input.value, updatedAt: new Date() })
    .where(eq(schema.project.id, project.id));
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

/** Tasks go with the project (`onDelete: "cascade"`). */
export async function deleteProjectAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.project).where(eq(schema.project.id, project.id));
  revalidatePath("/");
  redirect("/");
}
