import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { getOwnedOrganization, listOrganizations } from "@/features/organizations/queries";
import { getOwnedProject } from "@/features/projects/queries";
import { deleteTaskFromPageAction } from "@/features/tasks/actions";
import { EditTaskForm } from "@/features/tasks/edit-task-form";
import { getProjectTask } from "@/features/tasks/queries";
import { dueState, formatDueDate, todayUtc } from "@/features/tasks/due-dates";
import { priorityLabel } from "@/features/tasks/task-priority";
import { parseTaskStatus, TASK_STATUSES } from "@/features/tasks/task-status";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  const { projectId, taskId } = await params;
  const session = await requireSession(`/projects/${projectId}/tasks/${taskId}`);
  const project = await getOwnedProject(session.user.id, projectId);
  const task = project ? await getProjectTask(project.id, taskId) : null;
  if (!project || !task) {
    notFound();
  }

  const [customer, customers] = await Promise.all([
    task.organizationId ? getOwnedOrganization(session.user.id, task.organizationId, "customer") : null,
    listOrganizations(session.user.id, "customer"),
  ]);
  const status = TASK_STATUSES.find((s) => s.status === (parseTaskStatus(task.status) ?? "todo"))!;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} />

      <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href={`/projects/${project.id}`} className="hover:underline">
            {project.name}
          </Link>
        </nav>

        <section className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {status.label}
            </span>
            <span>{priorityLabel(task.priority)} priority</span>
            {task.dueDate ? (
              <span>
                Due <time dateTime={task.dueDate}>{formatDueDate(task.dueDate)}</time>{" "}
                {dueState(task.dueDate, task.status, todayUtc()) === "overdue" && (
                  <span className="ml-2 font-medium text-destructive">Overdue</span>
                )}
              </span>
            ) : (
              <span>No due date</span>
            )}
            {customer ? (
              <span>
                Customer:{" "}
                <Link href={`/customers/${customer.id}`} className="font-medium text-foreground hover:underline">
                  {customer.name}
                </Link>
              </span>
            ) : (
              <span>No customer</span>
            )}
          </div>
          {task.description ? (
            <p className="whitespace-pre-wrap pt-2 text-muted-foreground">{task.description}</p>
          ) : (
            <p className="pt-2 text-sm text-muted-foreground">No description yet.</p>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit task</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Keyed on the last save, so the form starts from the saved values after each save
                (React resets a submitted form to its initial defaults otherwise). */}
            <EditTaskForm
              key={task.updatedAt.toISOString()}
              projectId={project.id}
              task={task}
              customers={customers}
            />
          </CardContent>
        </Card>

        <form action={deleteTaskFromPageAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="taskId" value={task.id} />
          <Button type="submit" variant="outline">Delete task</Button>
        </form>
      </main>
    </div>
  );
}
