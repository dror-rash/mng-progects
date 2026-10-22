import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { createProjectAction } from "@/features/projects/actions";
import { ProjectList } from "@/features/projects/project-list";
import { listProjects } from "@/features/projects/queries";
import { summarizeByProject } from "@/features/tasks/progress";
import { listOwnedTaskStatuses } from "@/features/tasks/queries";

export const dynamic = "force-dynamic";

export default async function AllProjectsPage() {
  const session = await requireSession("/projects");
  const [projects, taskStatuses] = await Promise.all([
    listProjects(session.user.id),
    listOwnedTaskStatuses(session.user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} />

      <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
        <h1 className="text-2xl font-bold tracking-tight">All projects</h1>

        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Start tracking deliverables and tasks with your team</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createProjectAction} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">Project name</label>
                <Input id="name" name="name" placeholder="e.g. Website Redesign" required />
              </div>
              <div className="space-y-1">
                <label htmlFor="description" className="text-sm font-medium">Description</label>
                <Input id="description" name="description" placeholder="Short description of this project" />
              </div>
              <Button type="submit">Create Project</Button>
            </form>
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
