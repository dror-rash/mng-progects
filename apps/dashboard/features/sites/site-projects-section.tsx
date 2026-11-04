import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import Link from "next/link";

import { ProjectList } from "@/features/projects/project-list";
import type { TaskSummary } from "@/features/tasks/progress";

type Project = { id: string; name: string; description: string | null; createdAt: Date };

/**
 * The projects at a site that the user can see (task 072), each a link with its progress. "New project"
 * starts one at this site for those who may (`canStart`: admins, and partners at their customers' sites).
 */
export function SiteProjectsSection({
  siteId,
  projects,
  progress,
  canStart,
}: {
  siteId: string;
  projects: Project[];
  progress: Map<string, TaskSummary>;
  canStart: boolean;
}) {
  return (
    <section aria-labelledby="site-projects-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id="site-projects-heading" className="text-base font-semibold">Projects</h2>
        {canStart && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/new?site=${siteId}`}>New project</Link>
          </Button>
        )}
      </div>
      {projects.length === 0 ? (
        <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">No projects at this site yet.</Card>
      ) : (
        <ProjectList projects={projects} progress={progress} showCustomer={false} />
      )}
    </section>
  );
}
