import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { workspaceAccess } from "@/features/access/require-change";
import { listCustomerNames } from "@/features/organizations/customer-names";
import { listPartners } from "@/features/partners/queries";
import { ProjectForm } from "@/features/projects/project-form";
import { INTERNAL_OWNER, projectOwnerValue } from "@/features/projects/project-owner";
import { getProjectForUser } from "@/features/projects/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

/**
 * Copy a project into a new one (rule 4a), for those who can change it: a partner's users into their own
 * partner, admins to any owner. Everyone else gets the same page as for a missing project.
 */
export default async function CopyProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { session } = await requireWorkspace(`/projects/${projectId}/copy`);
  const project = await getProjectForUser(session.user.id, projectId);
  // The role where the project is, which may not be the current workspace.
  const access = project?.canChange ? await workspaceAccess(session.user.id, project.workspaceId) : null;
  if (!project || !access || access.role === "auditor") {
    notFound();
  }

  const partnerId = access.role === "partner" ? access.partnerId : null;
  const [customers, partners] = await Promise.all([
    listCustomerNames(session.user.id, project.workspaceId, partnerId),
    access.role === "admin" ? listPartners(session.user.id, project.workspaceId) : null,
  ]);
  const owners = partners?.length
    ? [{ value: INTERNAL_OWNER, label: "Internal" }, ...partners.map((p) => ({ value: p.id, label: p.name }))]
    : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Copy to new project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The new project gets this project&apos;s description and tasks, without assignees. This project stays as it is.
          </p>
          <ProjectForm
            copyOf={project}
            workspaceId={project.workspaceId}
            customers={customers}
            owners={owners}
            defaultOwner={projectOwnerValue(project.partnerId)}
            customerRequired={partnerId !== null}
          />
        </CardContent>
      </Card>
    </main>
  );
}
