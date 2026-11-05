import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table";
import Link from "next/link";
import { notFound } from "next/navigation";

import { canBuildReadingForms, canSeeReadingForms } from "@/features/access/scope";
import { AppHeader } from "@/features/layout/app-header";
import { formStatusLabel } from "@/features/reading-forms/form-status";
import { listReadingForms } from "@/features/reading-forms/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

function count(n: number) {
  return `${n} ${n === 1 ? "field" : "fields"}`;
}

/** The current workspace's reading forms (task 060): admins and auditors; others get a not-found page. */
export default async function ReadingFormsPage() {
  const { session, workspace } = await requireWorkspace("/forms");
  if (!canSeeReadingForms(workspace.role)) {
    notFound();
  }
  const forms = await listReadingForms(session.user.id, workspace.id);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} role={workspace.role} workspaceName={workspace.name} />

      <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/workspace/settings" className="hover:underline">Workspace settings</Link>
        </nav>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Reading forms</h1>
          {canBuildReadingForms(workspace.role) && (
            <Button asChild>
              <Link href="/forms/new">New form</Link>
            </Button>
          )}
        </div>

        {forms.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            No reading forms yet. Technicians fill them in on site once an admin publishes them.
          </Card>
        ) : (
          <Table>
            <TableCaption className="sr-only">Reading forms</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fields</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableHead scope="row">
                    <Link href={`/forms/${form.id}`} className="hover:underline">
                      {form.name}
                    </Link>
                  </TableHead>
                  <TableCell>{formStatusLabel(form.status)}</TableCell>
                  <TableCell>{count(form.fieldCount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
    </div>
  );
}
