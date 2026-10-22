"use server";

import { getSession } from "@repo/auth/server";
import { and, eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";

import { getOwnedProject } from "@/features/projects/queries";

import { parseTaskStatus } from "./task-status";

/** Every task action re-checks that the signed-in user owns the project. */
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

function taskInProject(formData: FormData, projectId: string) {
  return and(eq(schema.task.id, String(formData.get("taskId") ?? "")), eq(schema.task.projectId, projectId));
}

export async function createTaskAction(formData: FormData) {
  const project = await requireOwnedProject(formData);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    throw new Error("Task title is required");
  }

  await getDb().insert(schema.task).values({ id: crypto.randomUUID(), projectId: project.id, title });
  revalidatePath(`/projects/${project.id}`);
}

export async function updateTaskStatusAction(formData: FormData) {
  const project = await requireOwnedProject(formData);
  const status = parseTaskStatus(formData.get("status"));
  if (!status) {
    throw new Error("Unknown task status");
  }

  await getDb()
    .update(schema.task)
    .set({ status, updatedAt: new Date() })
    .where(taskInProject(formData, project.id));
  revalidatePath(`/projects/${project.id}`);
}

export async function deleteTaskAction(formData: FormData) {
  const project = await requireOwnedProject(formData);

  await getDb().delete(schema.task).where(taskInProject(formData, project.id));
  revalidatePath(`/projects/${project.id}`);
}
