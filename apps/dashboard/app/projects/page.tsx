import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";

import { AppHeader } from "@/features/layout/app-header";
import { ProjectForm } from "@/features/projects/project-form";
import { ProjectList } from "@/features/projects/project-list";
import { listOrganizations } from "@/features/organizations/queries";
import { listProjects } from "@/features/projects/queries";
import { summarizeByProject } from "@/features/tasks/progress";
import { listWorkspaceTaskStatuses } from "@/features/tasks/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function AllProjectsPage() {
  const { session, workspace } = await requireWorkspace("/projects");
  const [projects, taskStatuses, customers] = await Promise.all([
    listProjects(workspace.id),
    listWorkspaceTaskStatuses(workspace.id),
    listOrganizations(workspace.id, "customer"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} workspaceName={workspace.name} />

      <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
        <h1 className="text-2xl font-bold tracking-tight">All projects</h1>

        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Start tracking deliverables and tasks with your team</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectForm workspaceId={workspace.id} customers={customers} />
          </CardContent>
        </Card>

        {projects.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            No projects yet. Use the form above to add your first project.
          </Card>
        ) : (
          <ProjectList projects={projects} progress={summarizeByProject(taskStatuses)} />
        )}
      </main>
    </div>
  );
}
