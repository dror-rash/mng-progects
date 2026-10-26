"use server";

import { and, eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";
import { ownsCustomer } from "@/features/organizations/queries";
import { revalidateOverviews } from "@/features/projects/revalidate";
import { requireOwnedProject } from "@/features/projects/require-owned-project";

import { nextCompletedAt } from "./activity";
import { parseTaskInput } from "./task-input";
import { parseTaskStatus } from "./task-status";

/** The project's board plus every page that shows task counts or a customer's open tasks. */
function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/customers/[customerId]", "page");
  revalidateOverviews();
}

function taskInProject(formData: FormData, projectId: string) {
  return and(eq(schema.task.id, String(formData.get("taskId") ?? "")), eq(schema.task.projectId, projectId));
}

export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const input = parseTaskInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData);
  }

  const { organizationId, ...fields } = input.value;
  if (!(await ownsCustomer(project.ownerId, organizationId))) {
    return invalid("Choose one of your customers", formData, "customerId");
  }

  // A new task is about the project's customer unless the form chose otherwise.
  await getDb()
    .insert(schema.task)
    .values({
      id: crypto.randomUUID(),
      projectId: project.id,
      ...fields,
      organizationId: organizationId === undefined ? project.organizationId : organizationId,
    });
  revalidateProject(project.id);
  return {};
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

export async function updateTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));
  const input = parseTaskInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData);
  }

  const { organizationId, ...fields } = input.value;
  if (!(await ownsCustomer(project.ownerId, organizationId))) {
    return invalid("Choose one of your customers", formData, "customerId");
  }

  const updated = await getDb()
    .update(schema.task)
    .set({ ...fields, ...(organizationId !== undefined && { organizationId }), updatedAt: new Date() })
    .where(taskInProject(formData, project.id))
    .returning({ id: schema.task.id });
  if (updated.length === 0) {
    return invalid("This task no longer exists", formData);
  }
  revalidatePath(`/projects/${project.id}/tasks/${String(formData.get("taskId") ?? "")}`);
  revalidateProject(project.id);
  return {};
}

/** Delete from the task's own page, then go back to the board. */
export async function deleteTaskFromPageAction(formData: FormData) {
  const project = await requireOwnedProject(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.task).where(taskInProject(formData, project.id));
  revalidateProject(project.id);
  redirect(`/projects/${project.id}`);
}
