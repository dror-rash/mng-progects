import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProjectForUser } from "@/features/projects/queries";
import { createReadingAction } from "@/features/readings/actions";
import { getOpenForm, listOpenForms } from "@/features/readings/queries";
import { ReadingForm } from "@/features/readings/reading-form";
import { formatDueDate } from "@/features/tasks/due-dates";
import { getProjectVisit } from "@/features/visits/queries";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

type Params = Promise<{ projectId: string; visitId: string }>;
type SearchParams = Promise<{ form?: string | string[] }>;

/**
 * Add a reading on a visit (task 061), for whoever can work on the project; anyone else gets "Visit not found".
 * Lists the workspace's published forms as links (`?form=<id>`); with `?form=` naming one, its fields. An
 * unknown, draft, archived or another workspace's `?form=` shows the list again. Forms link only here, never
 * to `/forms` (closed to workers and partners).
 */
export default async function NewReadingPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { projectId, visitId } = await params;
  const { form: formParam } = await searchParams;
  const path = `/projects/${projectId}/visits/${visitId}/readings/new`;
  const { session } = await requireWorkspace(path);
  const project = await getProjectForUser(session.user.id, projectId);
  const visit = project?.canWork ? await getProjectVisit(session.user.id, project.id, visitId) : null;
  if (!project?.canWork || !visit) {
    notFound();
  }
  const formId = typeof formParam === "string" ? formParam : "";
  const chosen = formId ? await getOpenForm(session.user.id, project.workspaceId, formId) : null;
  const forms = chosen ? [] : await listOpenForms(session.user.id, project.workspaceId);
  const visitHref = `/projects/${project.id}/visits/${visit.id}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <h1>Add a reading</h1>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {project.name} · Visit on <time dateTime={visit.visitedOn}>{formatDueDate(visit.visitedOn)}</time>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {chosen ? (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{chosen.name}</h2>
                {chosen.description && <p className="text-sm text-muted-foreground">{chosen.description}</p>}
              </div>
              <ReadingForm
                action={createReadingAction}
                projectId={project.id}
                visitId={visit.id}
                versionId={chosen.versionId}
                fields={chosen.fields}
                cancelHref={visitHref}
              />
            </>
          ) : (
            <>
              {forms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reading forms are published yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {forms.map((form) => (
                    <li key={form.id} className="space-y-1 py-2 first:pt-0">
                      <Link href={`${path}?form=${encodeURIComponent(form.id)}`} className="font-medium hover:underline">
                        {form.name}
                      </Link>
                      {form.description && <p className="text-muted-foreground">{form.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="ghost">
                <Link href={visitHref}>Back to the visit</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
