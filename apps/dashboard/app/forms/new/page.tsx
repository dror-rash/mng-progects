import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { canBuildReadingForms } from "@/features/access/scope";
import { AppHeader } from "@/features/layout/app-header";
import { NewReadingFormForm } from "@/features/reading-forms/new-reading-form-form";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

/** A new reading form in the current workspace (task 060): admins only. */
export default async function NewReadingFormPage() {
  const { session, workspace } = await requireWorkspace("/forms/new");
  if (!canBuildReadingForms(workspace.role)) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} workspaceName={workspace.name} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>New reading form</CardTitle>
          </CardHeader>
          <CardContent>
            <NewReadingFormForm workspaceId={workspace.id} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
