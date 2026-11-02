import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { workspaceAccess } from "@/features/access/require-change";
import { listCustomerNames } from "@/features/organizations/customer-names";
import { ProjectForm } from "@/features/projects/project-form";
import { getProjectForUser } from "@/features/projects/queries";
import { listSiteChoices } from "@/features/sites/site-choices";
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
  // The role where the project is, which may not be the current workspace.
  const [access, customers, sites] = await Promise.all([
    workspaceAccess(session.user.id, project.workspaceId),
    listCustomerNames(session.user.id, project.workspaceId, project.partnerId),
    listSiteChoices(session.user.id, project.workspaceId, project.partnerId),
  ]);

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
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              organizationId: project.organizationId,
              siteId: project.siteId,
            }}
            customers={customers}
            sites={sites}
            customerRequired={access?.role === "partner"}
            canAddSite={access?.role === "admin"}
          />
        </CardContent>
      </Card>
    </main>
  );
}
