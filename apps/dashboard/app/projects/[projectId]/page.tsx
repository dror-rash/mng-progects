import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/features/layout/app-header";
import { recordWorkspace } from "@/features/layout/record-workspace";
import { getOrganizationForUser } from "@/features/organizations/queries";
import { setProjectLifecycleAction } from "@/features/projects/actions";
import { isCanceled, projectLifecycleLabel } from "@/features/projects/project-lifecycle";
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

  // The customer is a link only for those who can open customer pages; partners see its name only. The
  // project it was copied from shows only to those who can see that one too (rule 4a).
  const [tasks, customerPage, copiedFrom] = await Promise.all([
    listProjectTasks(session.user.id, project.id),
    project.organizationId && project.customerName
      ? getOrganizationForUser(session.user.id, project.organizationId, "customer")
      : null,
    project.copiedFromId ? getProjectForUser(session.user.id, project.copiedFromId) : null,
  ]);
  const canceled = isCanceled(project.lifecycle);
  // Most urgent first in each column; tasks arrive oldest first, and the sort keeps that within a priority.
  // Only the fields a card shows cross to the client.
  const boardTasks = [...tasks]
    .sort(byPriority)
    .map(({ id, title, status, priority, dueDate, assigneeName, customerName }) => ({ id, title, status, priority, dueDate, assigneeName, customerName }));

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} {...await recordWorkspace(session.user.id, workspace, project.workspaceId)} />

      <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {canceled && <Badge variant="outline">{projectLifecycleLabel(project.lifecycle)}</Badge>}
            </div>
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
            <p className="text-sm text-muted-foreground">
              {project.customerName ? (
                <>
                  Customer:{" "}
                  {customerPage ? (
                    <Link href={`/customers/${customerPage.id}`} className="font-medium text-foreground hover:underline">
                      {project.customerName}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{project.customerName}</span>
                  )}
                </>
              ) : (
                "No customer"
              )}
            </p>
            {copiedFrom && (
              <p className="text-sm text-muted-foreground">
                Copied from{" "}
                <Link href={`/projects/${copiedFrom.id}`} className="font-medium text-foreground hover:underline">
                  {copiedFrom.name}
                </Link>
              </p>
            )}
          </div>
          {project.canChange && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${project.id}/edit`}>Edit project</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${project.id}/copy`}>Copy to new project</Link>
              </Button>
              {/* Cancel or reopen (rule 4b): the project and its tasks stay editable either way. */}
              <form action={setProjectLifecycleAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="lifecycle" value={canceled ? "active" : "canceled"} />
                <Button type="submit" variant="outline" size="sm">{canceled ? "Reopen project" : "Cancel project"}</Button>
              </form>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/projects/${project.id}/delete`}>Delete project</Link>
              </Button>
            </div>
          )}
        </section>

        {project.canChange && <AddTaskForm projectId={project.id} />}

        <TaskBoard
          projectId={project.id}
          tasks={boardTasks}
          today={todayUtc()}
          moveAction={updateTaskStatusAction}
          deleteAction={deleteTaskAction}
          readOnly={!project.canChange}
        />
      </main>
    </div>
  );
}
