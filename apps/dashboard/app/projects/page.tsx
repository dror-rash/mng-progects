import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import Link from "next/link";

import { AppHeader } from "@/features/layout/app-header";
import { ProjectList } from "@/features/projects/project-list";
import { listProjects } from "@/features/projects/queries";
import { summarizeProjectStatusCounts } from "@/features/tasks/progress";
import { countTasksByProjectAndStatus } from "@/features/tasks/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function AllProjectsPage() {
  const { session, workspace } = await requireWorkspace("/projects");
  const [projects, projectCounts] = await Promise.all([listProjects(workspace.id), countTasksByProjectAndStatus(workspace.id)]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} workspaceName={workspace.name} />

      <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">All projects</h1>
          <Button asChild>
            <Link href="/projects/new">New project</Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            No projects yet. Add your first one with “New project”.
          </Card>
        ) : (
          <ProjectList projects={projects} progress={summarizeProjectStatusCounts(projectCounts)} />
        )}
      </main>
    </div>
  );
}
