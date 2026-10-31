import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProjectAction } from "@/features/projects/actions";
import { getProjectForUser } from "@/features/projects/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function DeleteProjectPage({ params }: { params: Promise<{ projectId: string }> }) {

  const { projectId } = await params;
  const { session } = await requireWorkspace(`/projects/${projectId}/delete`);
  const project = await getProjectForUser(session.user.id, projectId);
  // Someone who can't change it gets the same page as for a missing project.
  if (!project?.canChange) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Delete &ldquo;{project.name}&rdquo;?</CardTitle>
          <CardDescription>
            This deletes the project and all of its tasks. An admin can restore them from Deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteProjectAction} className="flex gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <Button type="submit" variant="destructive">Yes, delete project</Button>
            <Button asChild variant="ghost">
              <Link href={`/projects/${project.id}`}>Cancel</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
