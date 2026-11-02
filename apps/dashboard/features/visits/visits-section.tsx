import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";

import { formatDueDate } from "@/features/tasks/due-dates";

import { visitName } from "./visit-name";

type VisitRow = { id: string; visitedOn: string; notes: string | null; memberNames: string };

/**
 * A project's Visits (task 058): newest first, each with its day, who was there and its name (the notes'
 * first line) linking to the visit. "Record a visit" for those who can work on the project.
 */
export function VisitsSection({ projectId, visits, canRecord }: { projectId: string; visits: VisitRow[]; canRecord: boolean }) {
  return (
    <section aria-labelledby="visits-heading">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle id="visits-heading" className="text-base">Visits</CardTitle>
          {canRecord && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${projectId}/visits/new`}>Record a visit</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="text-sm">
          {visits.length === 0 ? (
            <p className="text-muted-foreground">No visits yet.</p>
          ) : (
            <ul className="divide-y">
              {visits.map((visit) => (
                <li key={visit.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 first:pt-0">
                  <Link href={`/projects/${projectId}/visits/${visit.id}`} className="font-medium hover:underline">
                    {visitName(visit.notes, visit.visitedOn)}
                  </Link>
                  <span className="text-muted-foreground">
                    <time dateTime={visit.visitedOn}>{formatDueDate(visit.visitedOn)}</time>
                    {visit.memberNames && <> · {visit.memberNames}</>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
