"use server";

import { and, eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { revalidateOverviews } from "@/features/projects/revalidate";
import { requireOwnedProject } from "@/features/projects/require-owned-project";

import { nextCompletedAt } from "./activity";
import { parseTaskInput } from "./task-input";
import { parseTaskStatus } from "./task-status";

/** The project's board plus every page that shows task counts. */
function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidateOverviews();
}

function taskInProject(formData: FormData, projectId: string) {
  return and(eq(schema.task.id, String(formData.get("taskId") ?? "")), eq(schema.task.projectId, projectId));
}

export async function createTaskAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const input = parseTaskInput(formData);
  if (!input.ok) {
    throw new Error(input.error);
  }

  await getDb().insert(schema.task).values({ id: crypto.randomUUID(), projectId: project.id, ...input.value });
  revalidateProject(project.id);
}

export async function updateTaskStatusAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const status = parseTaskStatus(formData.get("status"));
  if (!status) {
    throw new Error("Unknown task status");
  }

  const db = getDb();
  const [task] = await db
    .select({ status: schema.task.status, completedAt: schema.task.completedAt })
    .from(schema.task)
    .where(taskInProject(formData, project.id));
  if (!task) {
    throw new Error("Task not found");
  }

  const now = new Date();
  await db
    .update(schema.task)
    .set({ status, completedAt: nextCompletedAt(task, status, now), updatedAt: now })
    .where(taskInProject(formData, project.id));
  revalidateProject(project.id);
}

export async function deleteTaskAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.task).where(taskInProject(formData, project.id));
  revalidateProject(project.id);
}

export async function updateTaskAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const input = parseTaskInput(formData);
  if (!input.ok) {
    throw new Error(input.error);
  }

  await getDb()
    .update(schema.task)
    .set({ ...input.value, updatedAt: new Date() })
    .where(taskInProject(formData, project.id));
  revalidatePath(`/projects/${project.id}/tasks/${String(formData.get("taskId") ?? "")}`);
  revalidateProject(project.id);
}

/** Delete from the task's own page, then go back to the board. */
export async function deleteTaskFromPageAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.task).where(taskInProject(formData, project.id));
  revalidateProject(project.id);
  redirect(`/projects/${project.id}`);
}
