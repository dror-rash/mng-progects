import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth/require-session";
import { ProjectForm } from "@/features/projects/project-form";
import { listOrganizations } from "@/features/organizations/queries";
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
          <ProjectForm project={project} customers={await listOrganizations(session.user.id, "customer")} />
        </CardContent>
      </Card>
    </main>
  );
}
