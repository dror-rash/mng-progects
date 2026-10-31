import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { AppHeader } from "@/features/layout/app-header";
import { listOrganizations } from "@/features/organizations/queries";
import { ProjectForm } from "@/features/projects/project-form";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const { session, workspace } = await requireWorkspace("/projects/new");
  const customers = await listOrganizations(workspace.id, "customer");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} workspaceName={workspace.name} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>New project</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm workspaceId={workspace.id} customers={customers} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
