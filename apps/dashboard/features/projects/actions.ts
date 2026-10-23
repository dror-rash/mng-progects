"use server";

import { getSession } from "@repo/auth/server";
import { eq, getDb, schema } from "@repo/db";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";

import { parseProjectInput } from "./project-input";
import { requireOwnedProject } from "./require-owned-project";
import { revalidateOverviews } from "./revalidate";

export async function createProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  const input = parseProjectInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData);
  }

  await getDb().insert(schema.project).values({ id: crypto.randomUUID(), ...input.value, ownerId: session.user.id });
  revalidateOverviews();
  return {};
}

export async function updateProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const input = parseProjectInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData);
  }

  await getDb()
    .update(schema.project)
    .set({ ...input.value, updatedAt: new Date() })
    .where(eq(schema.project.id, project.id));
  revalidateOverviews();
  redirect(`/projects/${project.id}`);
}

/** Tasks go with the project (`onDelete: "cascade"`). */
export async function deleteProjectAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.project).where(eq(schema.project.id, project.id));
  revalidateOverviews();
  redirect("/");
}
