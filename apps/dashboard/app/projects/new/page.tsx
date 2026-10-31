import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { canChange, canSeeCustomers } from "@/features/access/scope";
import { AppHeader } from "@/features/layout/app-header";
import { firstParam, withParams } from "@/features/navigation/search-params";
import { listCustomerNames } from "@/features/organizations/customer-names";
import { listPartners } from "@/features/partners/queries";
import { ProjectForm } from "@/features/projects/project-form";
import { INTERNAL_OWNER } from "@/features/projects/project-owner";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewProjectPage({ searchParams }: { searchParams: SearchParams }) {
  const requested = firstParam((await searchParams).customer);
  const { session, workspace } = await requireWorkspace(withParams("/projects/new", { customer: requested }));
  if (!canChange(workspace.role)) {
    notFound();
  }
  // A partner's users create their own partner's projects, for its customers; admins choose the owner.
  const partnerId = workspace.role === "partner" ? workspace.partnerId : null;
  const [customers, partners] = await Promise.all([
    listCustomerNames(session.user.id, workspace.id, partnerId),
    workspace.role === "admin" ? listPartners(session.user.id, workspace.id) : null,
  ]);
  // No Owner select before the workspace has partners: the project is internal.
  const owners = partners?.length
    ? [{ value: INTERNAL_OWNER, label: "Internal" }, ...partners.map((p) => ({ value: p.id, label: p.name }))]
    : undefined;
  // Started from a customer's page: choose that customer and go back there on Cancel. Others are ignored.
  const customer = customers.find((c) => c.id === requested);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} workspaceName={workspace.name} />
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
              cancelHref={customer && canSeeCustomers(workspace.role) ? `/customers/${customer.id}` : undefined}
              owners={owners}
              customerRequired={partnerId !== null}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
