"use server";

import { and, eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";

import { requireOwnedProject } from "@/features/projects/require-owned-project";

import { parseTaskStatus } from "./task-status";

function taskInProject(formData: FormData, projectId: string) {
  return and(eq(schema.task.id, String(formData.get("taskId") ?? "")), eq(schema.task.projectId, projectId));
}

export async function createTaskAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    throw new Error("Task title is required");
  }

  await getDb().insert(schema.task).values({ id: crypto.randomUUID(), projectId: project.id, title });
  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/");
}

export async function updateTaskStatusAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const status = parseTaskStatus(formData.get("status"));
  if (!status) {
    throw new Error("Unknown task status");
  }

  await getDb()
    .update(schema.task)
    .set({ status, completedAt: status === "done" ? new Date() : null, updatedAt: new Date() })
    .where(taskInProject(formData, project.id));
  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/");
}

export async function deleteTaskAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.task).where(taskInProject(formData, project.id));
  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/");
}
