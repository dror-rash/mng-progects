import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { AppHeader } from "@/features/layout/app-header";
import { CustomerForm } from "@/features/organizations/customer-form";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const { session, workspace } = await requireWorkspace("/customers/new");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} workspaceName={workspace.name} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>New customer</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm workspaceId={workspace.id} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
