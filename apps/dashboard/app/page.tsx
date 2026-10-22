import { SignOutButton } from "@repo/auth/components";
import { desc, eq, getDb, schema } from "@repo/db";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import Link from "next/link";

import { requireSession } from "@/features/auth/require-session";
import { summarizeTasks } from "@/features/tasks/progress";
import { listOwnedTaskStatuses } from "@/features/tasks/queries";

import { createProjectAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession("/");

  const db = getDb();
  const projects = await db
    .select()
    .from(schema.project)
    .where(eq(schema.project.ownerId, session.user.id))
    .orderBy(desc(schema.project.createdAt));
  const taskStatuses = await listOwnedTaskStatuses(session.user.id);
  const overall = summarizeTasks(taskStatuses);
  const progressFor = (projectId: string) => summarizeTasks(taskStatuses.filter((t) => t.projectId === projectId));

  const stats = [
    { id: "total-projects", label: "Total Projects", value: String(projects.length), hint: "Active in your workspace" },
    { id: "open-tasks", label: "Open Tasks", value: String(overall.open), hint: "To do or in progress" },
    { id: "completion-rate", label: "Completion Rate", value: `${overall.completionRate}%`, hint: `${overall.done} of ${overall.total} tasks done` },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              W
            </div>
            <h1 className="text-xl font-bold tracking-tight">Project Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <Button asChild variant="outline" size="sm">
              <a href="/">Home</a>
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
        {/* Overview Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.id} role="group" aria-labelledby={`stat-${stat.id}`}>
                <CardHeader className="pb-2">
                  <CardDescription id={`stat-${stat.id}`}>{stat.label}</CardDescription>
                  <CardTitle className="text-3xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{stat.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Create Project Section */}
        <section className="space-y-4">
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
        </section>

        {/* Projects List */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold tracking-tight">Your Projects</h3>
          {projects.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-muted-foreground">
              No projects created yet. Use the form above to add your first project.
            </Card>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {projects.map((proj) => {
                const progress = progressFor(proj.id);
                return (
                  <li key={proj.id}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          <Link href={`/projects/${proj.id}`} className="hover:underline">
                            {proj.name}
                          </Link>
                        </CardTitle>
                        {proj.description && <CardDescription>{proj.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Created: {new Date(proj.createdAt).toLocaleDateString()}</span>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
                          {progress.done} of {progress.total} tasks done
                        </span>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
