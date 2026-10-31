"use server";

import { and, eq, getDb, schema, withAccess } from "@repo/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActionSession } from "@/features/auth/require-session";
import { type FormState, invalid } from "@/features/forms/form-state";
import { isCustomerChoice } from "@/features/organizations/customer-names";
import { isAssignable } from "@/features/workspaces/members";
import { revalidateOverviews } from "@/features/projects/revalidate";
import { requireProjectAccess } from "@/features/projects/require-project-access";

import { nextCompletedAt } from "./activity";
import { parseTaskInput } from "./task-input";
import { parseTaskStatus } from "./task-status";

// Each action does its reads and writes in one `withAccess` transaction, and redirects after it commits.

/** The project's board plus every page that shows task counts, a customer's open tasks, or My tasks. */
function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/customers/[customerId]", "page");
  revalidatePath("/my-tasks");
  revalidateOverviews();
}

function taskInProject(formData: FormData, projectId: string) {
  return and(eq(schema.task.id, String(formData.get("taskId") ?? "")), eq(schema.task.projectId, projectId));
}

type Project = Awaited<ReturnType<typeof requireProjectAccess>>;

/**
 * Why a task's customer or assignee can't be saved in `project`, or null when both can: the customer must
 * be one of the user's choices, in a partner's project one of the partner's (rule 7a); the assignee must
 * be assignable there (rule 7). A tampered id gets the same answer as a made-up one. Inside `withAccess`.
 */
async function refusal(project: Project, organizationId: string | null | undefined, assigneeId: string | null | undefined) {
  if (organizationId && !(await isCustomerChoice(project.workspaceId, project.partnerId, organizationId))) {
    return { error: "Choose one of your customers", field: "customerId" };
  }
  if (assigneeId && !(await isAssignable(assigneeId, project))) {
    return { error: "Choose someone in this workspace", field: "assigneeId" };
  }
  return null;
}

/** Runs `fn` as the signed-in user with the project of the form, if they can change it. */
async function withProject<T>(formData: FormData, fn: (project: Project) => Promise<T>) {
  const session = await requireActionSession();
  return withAccess(session.user.id, async () =>
    fn(await requireProjectAccess(session.user.id, String(formData.get("projectId") ?? ""))),
  );
}

export async function createTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await withProject(formData, async (project) => {
    const input = parseTaskInput(formData);
    if (!input.ok) {
      return invalid(input.error, formData, input.field);
    }

    const { organizationId, priority, dueDate, assigneeId, ...fields } = input.value;
    const refused = await refusal(project, organizationId, assigneeId);
    if (refused) {
      return invalid(refused.error, formData, refused.field);
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
    return { projectId: project.id };
  });
  if (!("projectId" in result)) {
    return result;
  }
  revalidateProject(result.projectId);
  return {};
}

export async function updateTaskStatusAction(formData: FormData) {
  const projectId = await withProject(formData, async (project) => {
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
    return project.id;
  });
  revalidateProject(projectId);
}

export async function deleteTaskAction(formData: FormData) {
  const projectId = await withProject(formData, async (project) => {
    await getDb().delete(schema.task).where(taskInProject(formData, project.id));
    return project.id;
  });
  revalidateProject(projectId);
}

export async function updateTaskAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await withProject(formData, async (project) => {
    const input = parseTaskInput(formData);
    if (!input.ok) {
      return invalid(input.error, formData, input.field);
    }

    const { organizationId, priority, dueDate, assigneeId, ...fields } = input.value;
    const refused = await refusal(project, organizationId, assigneeId);
    if (refused) {
      return invalid(refused.error, formData, refused.field);
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
    return { projectId: project.id };
  });
  if (!("projectId" in result)) {
    return result;
  }
  revalidatePath(`/projects/${result.projectId}/tasks/${String(formData.get("taskId") ?? "")}`);
  revalidateProject(result.projectId);
  return {};
}

/** Delete from the task's own page, then go back to the board. */
export async function deleteTaskFromPageAction(formData: FormData) {
  const projectId = await withProject(formData, async (project) => {
    await getDb().delete(schema.task).where(taskInProject(formData, project.id));
    return project.id;
  });
  revalidateProject(projectId);
  redirect(`/projects/${projectId}`);
}
