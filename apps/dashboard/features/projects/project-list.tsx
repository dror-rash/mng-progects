import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Meter } from "@repo/ui/meter";
import Link from "next/link";

import type { TaskSummary } from "@/features/tasks/progress";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  organizationId?: string | null;
  customerName?: string | null;
};

const NO_TASKS: TaskSummary = { total: 0, done: 0, open: 0, completionRate: 0 };

export function ProjectList({
  projects,
  progress,
  showCustomer = true,
}: {
  projects: Project[];
  progress: Map<string, TaskSummary>;
  /** Off on a customer's own page, where every project is theirs. */
  showCustomer?: boolean;
}) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => {
        const summary = progress.get(project.id) ?? NO_TASKS;
        return (
          <li key={project.id}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </CardTitle>
                {project.description && <CardDescription>{project.description}</CardDescription>}
                {showCustomer && project.organizationId && project.customerName && (
                  <p className="text-xs text-muted-foreground">
                    For{" "}
                    <Link href={`/customers/${project.organizationId}`} className="font-medium text-foreground hover:underline">
                      {project.customerName}
                    </Link>
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <Meter label={`${project.name} progress`} value={summary.completionRate} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Started {new Date(project.createdAt).toLocaleDateString()}</span>
                  <span className="font-medium text-foreground">
                    {summary.total === 0 ? "No tasks yet" : `${summary.done} of ${summary.total} ${summary.total === 1 ? "task" : "tasks"} done`}
                  </span>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
