import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { AppHeader } from "@/features/layout/app-header";
import { recordWorkspace } from "@/features/layout/record-workspace";
import { firstParam } from "@/features/navigation/search-params";
import { getOrganizationForUser } from "@/features/organizations/queries";
import { SiteForm } from "@/features/sites/site-form";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** A new site for the customer in `?customer=` (task 054). Admins only; anyone else gets "Customer not found". */
export default async function NewSitePage({ searchParams }: { searchParams: SearchParams }) {
  const customerId = firstParam((await searchParams).customer) ?? "";
  const { session, workspace } = await requireWorkspace(`/sites/new?customer=${encodeURIComponent(customerId)}`);
  const customer = customerId ? await getOrganizationForUser(session.user.id, customerId, "customer") : null;
  if (!customer?.canChange) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} {...await recordWorkspace(session.user.id, workspace, customer.workspaceId)} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>New site for {customer.parentName ? `${customer.parentName} › ${customer.name}` : customer.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <SiteForm customerId={customer.id} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
