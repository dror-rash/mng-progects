import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";

import { AppHeader } from "@/features/layout/app-header";
import { DeleteWorkspaceForm } from "@/features/workspaces/delete-workspace-form";
import { RenameWorkspaceForm } from "@/features/workspaces/rename-workspace-form";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

/** Rename or delete the current workspace. Admins only; the actions check that again (ADR-0005). */
export default async function WorkspaceSettingsPage() {
  const { session, workspace } = await requireWorkspace("/workspace/settings");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} workspaceName={workspace.name} />

      <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Workspace settings</h1>
          <Button asChild variant="ghost" size="sm">
            <Link href="/workspace">Members and invites</Link>
          </Button>
        </div>

        {workspace.role !== "admin" ? (
          <p className="text-sm text-muted-foreground">Only admins can manage this workspace.</p>
        ) : (
          <>
            <section aria-labelledby="rename-heading">
              <Card>
                <CardHeader>
                  <CardTitle id="rename-heading" className="text-base">Name</CardTitle>
                </CardHeader>
                <CardContent>
                  <RenameWorkspaceForm key={workspace.name} workspaceId={workspace.id} name={workspace.name} />
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="delete-heading">
              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle id="delete-heading" className="text-base">Delete workspace</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Deletes its projects, tasks, customers and invite links for every member, and removes everyone from it.
                  </p>
                  <DeleteWorkspaceForm workspaceId={workspace.id} name={workspace.name} />
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
