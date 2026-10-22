import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth/require-session";
import { updateProjectAction } from "@/features/projects/actions";
import { getOwnedProject } from "@/features/projects/queries";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) {

  const { projectId } = await params;
  const session = await requireSession(`/projects/${projectId}/edit`);
  const project = await getOwnedProject(session.user.id, projectId);
  if (!project) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit project</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProjectAction} className="space-y-4">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">Project name</label>
              <Input id="name" name="name" defaultValue={project.name} required />
            </div>
            <div className="space-y-1">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Input id="description" name="description" defaultValue={project.description ?? ""} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Save changes</Button>
              <Button asChild variant="ghost">
                <Link href={`/projects/${project.id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
