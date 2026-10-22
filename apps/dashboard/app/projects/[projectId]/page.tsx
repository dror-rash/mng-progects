import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { getOwnedProject } from "@/features/projects/queries";
import { createTaskAction, deleteTaskAction, updateTaskStatusAction } from "@/features/tasks/actions";
import { listProjectTasks } from "@/features/tasks/queries";
import { groupTasksByStatus, TASK_STATUSES } from "@/features/tasks/task-status";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {

  const { projectId } = await params;
  const session = await requireSession(`/projects/${projectId}`);
  const project = await getOwnedProject(session.user.id, projectId);
  if (!project) {
    notFound();
  }

  const columns = groupTasksByStatus(await listProjectTasks(project.id));

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} />

      <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
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

        <form action={createTaskAction} className="flex max-w-xl items-end gap-2">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="flex-1 space-y-1">
            <label htmlFor="title" className="text-sm font-medium">Task title</label>
            <Input id="title" name="title" placeholder="e.g. Write homepage copy" required />
          </div>
          <Button type="submit">Add task</Button>
        </form>

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
                          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
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
