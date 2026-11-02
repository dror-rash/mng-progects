import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { notFound } from "next/navigation";

import { getProjectForUser } from "@/features/projects/queries";
import { todayUtc } from "@/features/tasks/due-dates";
import { getProjectVisit } from "@/features/visits/queries";
import { VisitForm } from "@/features/visits/visit-form";
import { listAssigneeOptions } from "@/features/workspaces/members";
import { requireWorkspace } from "@/features/workspaces/require-workspace";

export const dynamic = "force-dynamic";

/** Edit a visit (task 058): its author and admins; anyone else gets "Visit not found". */
export default async function EditVisitPage({ params }: { params: Promise<{ projectId: string; visitId: string }> }) {
  const { projectId, visitId } = await params;
  const { session } = await requireWorkspace(`/projects/${projectId}/visits/${visitId}/edit`);
  const project = await getProjectForUser(session.user.id, projectId);
  const visit = project?.canWork ? await getProjectVisit(session.user.id, project.id, visitId) : null;
  if (!project || !visit?.canChange) {
    notFound();
  }
  const people = await listAssigneeOptions(session.user.id, project);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <h1>Edit visit</h1>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </CardHeader>
        <CardContent>
          {/* Only the fields the form uses cross to the client. Someone who was there but can no longer be
              chosen (left the crew) is kept off the choices and drops when saved. */}
          <VisitForm
            projectId={project.id}
            people={people}
            visit={{ id: visit.id, visitedOn: visit.visitedOn, notes: visit.notes, memberIds: visit.members.map((m) => m.userId) }}
            today={todayUtc()}
            cancelHref={`/projects/${project.id}/visits/${visit.id}`}
          />
        </CardContent>
      </Card>
    </main>
  );
}
