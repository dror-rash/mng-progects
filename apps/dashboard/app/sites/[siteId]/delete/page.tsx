import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSiteAction } from "@/features/sites/actions";
import { getSiteForUser, listProjectsAtSite } from "@/features/sites/queries";
import { siteInUseMessage } from "@/features/sites/site-in-use";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

export default async function DeleteSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { session } = await requireWorkspace(`/sites/${siteId}/delete`);
  const site = await getSiteForUser(session.user.id, siteId);
  // Someone who can't change it gets the same page as for a missing site.
  if (!site?.canChange) {
    notFound();
  }
  // A site in use stays (task 055): say where the projects are instead of offering the delete.
  const projects = await listProjectsAtSite(session.user.id, site.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Delete &ldquo;{site.name}&rdquo;?</CardTitle>
          <CardDescription>
            {projects.length > 0
              ? siteInUseMessage(projects)
              : "This deletes the site with its on-site contacts. An admin can restore it from Deleted."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <Button asChild variant="outline">
              <Link href={`/sites/${site.id}`}>Back to the site</Link>
            </Button>
          ) : (
            <form action={deleteSiteAction} className="flex gap-2">
              <input type="hidden" name="siteId" value={site.id} />
              <Button type="submit" variant="destructive">Yes, delete site</Button>
              <Button asChild variant="ghost">
                <Link href={`/sites/${site.id}`}>Cancel</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
