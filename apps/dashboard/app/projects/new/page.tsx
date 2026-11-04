import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { canChange, canSeeCustomers } from "@/features/access/scope";
import { AppHeader } from "@/features/layout/app-header";
import { firstParam, withParams } from "@/features/navigation/search-params";
import { listCustomerNames } from "@/features/organizations/customer-names";
import { listPartners } from "@/features/partners/queries";
import { initialCustomerAndSite } from "@/features/projects/initial-customer-site";
import { ProjectForm } from "@/features/projects/project-form";
import { INTERNAL_OWNER } from "@/features/projects/project-owner";
import { listSiteChoices } from "@/features/sites/site-choices";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewProjectPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requested = { customer: firstParam(params.customer), site: firstParam(params.site) };
  const { session, workspace } = await requireWorkspace(withParams("/projects/new", requested));
  if (!canChange(workspace.role)) {
    notFound();
  }
  // A partner's users create their own partner's projects, for its customers; admins choose the owner.
  const partnerId = workspace.role === "partner" ? workspace.partnerId : null;
  const [customers, sites, partners] = await Promise.all([
    listCustomerNames(session.user.id, workspace.id, partnerId),
    listSiteChoices(session.user.id, workspace.id, partnerId),
    workspace.role === "admin" ? listPartners(session.user.id, workspace.id) : null,
  ]);
  // No Owner select before the workspace has partners: the project is internal.
  const owners = partners?.length
    ? [{ value: INTERNAL_OWNER, label: "Internal" }, ...partners.map((p) => ({ value: p.id, label: p.name }))]
    : undefined;
  // Started from a site's page (task 072) or a customer's: choose them and go back there on Cancel. Ids
  // that aren't among my choices are ignored.
  const start = initialCustomerAndSite(requested, customers, sites);
  const cancelHref = start.siteId
    ? `/sites/${start.siteId}`
    : start.customerId && canSeeCustomers(workspace.role)
      ? `/customers/${start.customerId}`
      : undefined;

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
              sites={sites}
              defaultCustomerId={start.customerId}
              defaultSiteId={start.siteId}
              cancelHref={cancelHref}
              owners={owners}
              customerRequired={partnerId !== null}
              canAddSite={workspace.role === "admin"}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
