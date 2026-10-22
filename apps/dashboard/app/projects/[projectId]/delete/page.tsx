import { getSession } from "@repo/auth/server";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { deleteProjectAction } from "@/features/projects/actions";
import { getOwnedProject } from "@/features/projects/queries";

export const dynamic = "force-dynamic";

export default async function DeleteProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { projectId } = await params;
  const project = await getOwnedProject(session.user.id, projectId);
  if (!project) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Delete &ldquo;{project.name}&rdquo;?</CardTitle>
          <CardDescription>This deletes the project and all of its tasks. It can&apos;t be undone.</CardDescription>
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
