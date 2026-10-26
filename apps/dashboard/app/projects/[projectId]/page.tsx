import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { getOwnedOrganization } from "@/features/organizations/queries";
import { getOwnedProject } from "@/features/projects/queries";
import { deleteTaskAction, updateTaskStatusAction } from "@/features/tasks/actions";
import { AddTaskForm } from "@/features/tasks/add-task-form";
import { listProjectTasks } from "@/features/tasks/queries";
import { dueState, formatDueDate, todayUtc } from "@/features/tasks/due-dates";
import { byPriority, DEFAULT_PRIORITY, parseTaskPriority, priorityLabel } from "@/features/tasks/task-priority";
import { groupTasksByStatus, TASK_STATUSES } from "@/features/tasks/task-status";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {

  const { projectId } = await params;
  const session = await requireSession(`/projects/${projectId}`);
  const project = await getOwnedProject(session.user.id, projectId);
  if (!project) {
    notFound();
  }

  const [tasks, customer] = await Promise.all([
    listProjectTasks(project.id),
    project.organizationId ? getOwnedOrganization(session.user.id, project.organizationId, "customer") : null,
  ]);
  // Most urgent first in each column; tasks arrive oldest first, and the sort keeps that within a priority.
  const columns = groupTasksByStatus([...tasks].sort(byPriority));
  const today = todayUtc();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} />

      <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
            <p className="text-sm text-muted-foreground">
              {customer ? (
                <>
                  Customer:{" "}
                  <Link href={`/customers/${customer.id}`} className="font-medium text-foreground hover:underline">
                    {customer.name}
                  </Link>
                </>
              ) : (
                "No customer"
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${project.id}/edit`}>Edit project</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/projects/${project.id}/delete`}>Delete project</Link>
            </Button>
          </div>
        </section>

        <AddTaskForm projectId={project.id} />

        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((column) => (
            <section
              key={column.status}
              aria-labelledby={`column-${column.status}`}
              className="space-y-3 rounded-lg bg-muted/50 p-3"
            >
              <h2 id={`column-${column.status}`} className="flex items-center justify-between text-sm font-semibold">
                {column.label}
                <span className="rounded-full bg-secondary px-2 text-xs text-secondary-foreground">{column.tasks.length}</span>
              </h2>
              {column.tasks.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No tasks</p>
              ) : (
                <ul className="space-y-2">
                  {column.tasks.map((task) => (
                    <li key={task.id}>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            <Link href={`/projects/${project.id}/tasks/${task.id}`} className="hover:underline">
                              {task.title}
                            </Link>
                          </CardTitle>
                          {(parseTaskPriority(task.priority) ?? DEFAULT_PRIORITY) !== DEFAULT_PRIORITY && (
                            <p className="text-xs font-medium">{priorityLabel(task.priority)} priority</p>
                          )}
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              Due <time dateTime={task.dueDate}>{formatDueDate(task.dueDate, "short")}</time>
                              {dueState(task.dueDate, task.status, today) === "overdue" && (
                                <span className="ml-2 font-medium text-destructive">Overdue</span>
                              )}
                            </p>
                          )}
                          {task.customerName && (
                            <p className="text-xs text-muted-foreground">For {task.customerName}</p>
                          )}
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-1">
                          {TASK_STATUSES.filter((s) => s.status !== column.status).map((target) => (
                            <form key={target.status} action={updateTaskStatusAction}>
                              <input type="hidden" name="projectId" value={project.id} />
                              <input type="hidden" name="taskId" value={task.id} />
                              <input type="hidden" name="status" value={target.status} />
                              <Button type="submit" variant="outline" size="sm">Move to {target.label}</Button>
                            </form>
                          ))}
                          <form action={deleteTaskAction}>
                            <input type="hidden" name="projectId" value={project.id} />
                            <input type="hidden" name="taskId" value={task.id} />
                            <Button type="submit" variant="ghost" size="sm">Delete task</Button>
                          </form>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
