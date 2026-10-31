import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { AppHeader } from "@/features/layout/app-header";
import { firstParam, withParams } from "@/features/navigation/search-params";
import { listOrganizations } from "@/features/organizations/queries";
import { ProjectForm } from "@/features/projects/project-form";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewProjectPage({ searchParams }: { searchParams: SearchParams }) {
  const requested = firstParam((await searchParams).customer);
  const { session, workspace } = await requireWorkspace(withParams("/projects/new", { customer: requested }));
  const customers = await listOrganizations(workspace.id, "customer");
  // Started from a customer's page: choose that customer and go back there on Cancel. Others are ignored.
  const customer = customers.find((c) => c.id === requested);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} workspaceName={workspace.name} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>New project</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm
              workspaceId={workspace.id}
              customers={customers}
              defaultCustomerId={customer?.id}
              cancelHref={customer ? `/customers/${customer.id}` : undefined}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
