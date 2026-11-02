import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteSiteAction } from "@/features/sites/actions";
import { getSiteForUser } from "@/features/sites/queries";
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

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Delete &ldquo;{site.name}&rdquo;?</CardTitle>
          <CardDescription>
            This deletes the site with its on-site contacts. An admin can restore it from Deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteSiteAction} className="flex gap-2">
            <input type="hidden" name="siteId" value={site.id} />
            <Button type="submit" variant="destructive">Yes, delete site</Button>
            <Button asChild variant="ghost">
              <Link href={`/sites/${site.id}`}>Cancel</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
