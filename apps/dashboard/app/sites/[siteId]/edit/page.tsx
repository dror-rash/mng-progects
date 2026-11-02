import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { AppHeader } from "@/features/layout/app-header";
import { recordWorkspace } from "@/features/layout/record-workspace";
import { getSiteForUser } from "@/features/sites/queries";
import { SiteForm } from "@/features/sites/site-form";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function EditSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { session, workspace } = await requireWorkspace(`/sites/${siteId}/edit`);
  const site = await getSiteForUser(session.user.id, siteId);
  // Someone who can't change it gets the same page as for a missing site.
  if (!site?.canChange) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} {...await recordWorkspace(session.user.id, workspace, site.workspaceId)} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit site</CardTitle>
          </CardHeader>
          <CardContent>
            <SiteForm customerId={site.organizationId} site={site} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
