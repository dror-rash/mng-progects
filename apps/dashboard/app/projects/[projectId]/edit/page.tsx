import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { ProjectForm } from "@/features/projects/project-form";
import { listCustomerNames } from "@/features/organizations/customer-names";
import { getProjectForUser } from "@/features/projects/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) {

  const { projectId } = await params;
  const { session } = await requireWorkspace(`/projects/${projectId}/edit`);
  const project = await getProjectForUser(session.user.id, projectId);
  // Someone who can't change it gets the same page as for a missing project.
  if (!project?.canChange) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit project</CardTitle>
        </CardHeader>
        <CardContent>
          {/* The owner never changes (rule 4a); a partner's project keeps one of the partner's customers. Only
              the fields the form uses cross to the client: the row also holds ids the viewer mustn't get
              (copied_from_id may name another partner's project). */}
          <ProjectForm
            project={{ id: project.id, name: project.name, description: project.description, organizationId: project.organizationId }}
            customers={await listCustomerNames(session.user.id, project.workspaceId, project.partnerId)}
            customerRequired={project.partnerId !== null}
          />
        </CardContent>
      </Card>
    </main>
  );
}
