import { Button } from "@repo/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/features/layout/app-header";
import { recordWorkspace } from "@/features/layout/record-workspace";
import { getOrganizationForUser } from "@/features/organizations/queries";
import { getProjectForUser } from "@/features/projects/queries";
import { deleteTaskAction, updateTaskStatusAction } from "@/features/tasks/actions";
import { AddTaskForm } from "@/features/tasks/add-task-form";
import { listProjectTasks } from "@/features/tasks/queries";
import { todayUtc } from "@/features/tasks/due-dates";
import { byPriority } from "@/features/tasks/task-priority";
import { TaskBoard } from "@/features/tasks/task-board";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {

  const { projectId } = await params;
  const { session, workspace } = await requireWorkspace(`/projects/${projectId}`);
  const project = await getProjectForUser(session.user.id, projectId);
  if (!project) {
    notFound();
  }

  const [tasks, customer] = await Promise.all([
    listProjectTasks(project.id),
    project.organizationId ? getOrganizationForUser(session.user.id, project.organizationId, "customer") : null,
  ]);
  // Most urgent first in each column; tasks arrive oldest first, and the sort keeps that within a priority.
  // Only the fields a card shows cross to the client.
  const boardTasks = [...tasks]
    .sort(byPriority)
    .map(({ id, title, status, priority, dueDate, assigneeName, customerName }) => ({ id, title, status, priority, dueDate, assigneeName, customerName }));

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} {...await recordWorkspace(session.user.id, workspace, project.workspaceId)} />

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

        <TaskBoard
          projectId={project.id}
          tasks={boardTasks}
          today={todayUtc()}
          moveAction={updateTaskStatusAction}
          deleteAction={deleteTaskAction}
        />
      </main>
    </div>
  );
}
