"use server";

import { and, eq, getDb, schema } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type FormState, invalid } from "@/features/forms/form-state";
import { customerInWorkspace } from "@/features/organizations/queries";
import { isMember } from "@/features/workspaces/queries";
import { revalidateOverviews } from "@/features/projects/revalidate";
import { requireProjectAccess } from "@/features/projects/require-project-access";

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
  const project = await requireProjectAccess(String(formData.get("projectId") ?? ""));
  const input = parseTaskInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  const { organizationId, priority, dueDate, assigneeId, ...fields } = input.value;
  if (!(await customerInWorkspace(project.workspaceId, organizationId))) {
    return invalid("Choose one of your customers", formData, "customerId");
  }
  if (assigneeId && !(await isMember(assigneeId, project.workspaceId))) {
    return invalid("Choose someone in this workspace", formData, "assigneeId");
  }

  // A new task is about the project's customer unless the form chose otherwise.
  await getDb()
    .insert(schema.task)
    .values({
      id: crypto.randomUUID(),
      projectId: project.id,
      ...fields,
      organizationId: organizationId === undefined ? project.organizationId : organizationId,
      ...(priority && { priority }),
      ...(dueDate !== undefined && { dueDate }),
      ...(assigneeId !== undefined && { assigneeId }),
    });
  revalidateProject(project.id);
  return {};
}

export async function updateTaskStatusAction(formData: FormData) {
  const project = await requireProjectAccess(String(formData.get("projectId") ?? ""));
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
  const project = await requireProjectAccess(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.task).where(taskInProject(formData, project.id));
  revalidateProject(project.id);
}

export async function updateTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const project = await requireProjectAccess(String(formData.get("projectId") ?? ""));
  const input = parseTaskInput(formData);
  if (!input.ok) {
    return invalid(input.error, formData, input.field);
  }

  const { organizationId, priority, dueDate, assigneeId, ...fields } = input.value;
  if (!(await customerInWorkspace(project.workspaceId, organizationId))) {
    return invalid("Choose one of your customers", formData, "customerId");
  }
  if (assigneeId && !(await isMember(assigneeId, project.workspaceId))) {
    return invalid("Choose someone in this workspace", formData, "assigneeId");
  }

  const updated = await getDb()
    .update(schema.task)
    .set({
      ...fields,
      ...(organizationId !== undefined && { organizationId }),
      ...(priority && { priority }),
      ...(dueDate !== undefined && { dueDate }),
      ...(assigneeId !== undefined && { assigneeId }),
      updatedAt: new Date(),
    })
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
  const project = await requireProjectAccess(String(formData.get("projectId") ?? ""));

  await getDb().delete(schema.task).where(taskInProject(formData, project.id));
  revalidateProject(project.id);
  redirect(`/projects/${project.id}`);
}
