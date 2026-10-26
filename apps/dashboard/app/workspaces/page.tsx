import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";

import { AppHeader } from "@/features/layout/app-header";
import { switchWorkspaceAction } from "@/features/workspaces/actions";
import { NewWorkspaceForm } from "@/features/workspaces/new-workspace-form";
import { listMemberships } from "@/features/workspaces/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";
import { workspaceRoleLabel } from "@/features/workspaces/roles";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const { session, workspace } = await requireWorkspace("/workspaces");
  const memberships = await listMemberships(session.user.id);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} workspaceName={workspace.name} />

      <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>

        <section aria-labelledby="your-workspaces-heading">
          <Card>
            <CardHeader>
              <CardTitle id="your-workspaces-heading" className="text-base">Your workspaces</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {memberships.map((m) => {
                  const isCurrent = m.workspaceId === workspace.id;
                  return (
                    <li key={m.workspaceId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{m.name}</span>
                        <Badge variant="outline">{workspaceRoleLabel(m.role)}</Badge>
                        {isCurrent && <Badge>Current</Badge>}
                      </div>
                      {isCurrent ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link href="/workspace">Members and invites</Link>
                        </Button>
                      ) : (
                        <form action={switchWorkspaceAction}>
                          <input type="hidden" name="workspaceId" value={m.workspaceId} />
                          <Button type="submit" variant="outline" size="sm">
                            Switch<span className="sr-only"> to {m.name}</span>
                          </Button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="new-workspace-heading">
          <Card>
            <CardHeader>
              <CardTitle id="new-workspace-heading" className="text-base">New workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <NewWorkspaceForm />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
