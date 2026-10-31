import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { AppHeader } from "@/features/layout/app-header";
import { recordWorkspace } from "@/features/layout/record-workspace";
import { CustomerForm } from "@/features/organizations/customer-form";
import { getOrganizationForUser } from "@/features/organizations/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const { session, workspace } = await requireWorkspace(`/customers/${customerId}/edit`);
  const customer = await getOrganizationForUser(session.user.id, customerId, "customer");
  // Someone who can't change it gets the same page as for a missing customer.
  if (!customer?.canChange) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} {...await recordWorkspace(session.user.id, workspace, customer.workspaceId)} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit customer</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm customer={customer} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
