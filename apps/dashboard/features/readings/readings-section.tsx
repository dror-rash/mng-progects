import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";

import { formatDueDate } from "@/features/tasks/due-dates";

export type ReadingRow = { id: string; visitId: string; formName: string; visitedOn: string; authorName: string | null };

/**
 * Readings (task 061), in the order given (newest first): each the form's name linking to the reading, the
 * visit's day (on the project page) and who filled it in. "Add a reading" when `addHref` is given (on a visit's
 * page, for those who can work on the project).
 */
export function ReadingsSection({
  projectId,
  readings,
  showVisitDates,
  addHref,
}: {
  projectId: string;
  readings: ReadingRow[];
  showVisitDates: boolean;
  addHref?: string;
}) {
  return (
    <section aria-labelledby="readings-heading">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle id="readings-heading" className="text-base">Readings</CardTitle>
          {addHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={addHref}>Add a reading</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="text-sm">
          {readings.length === 0 ? (
            <p className="text-muted-foreground">No readings yet.</p>
          ) : (
            <ul className="divide-y">
              {readings.map((reading) => (
                <li key={reading.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 first:pt-0">
                  <Link href={`/projects/${projectId}/visits/${reading.visitId}/readings/${reading.id}`} className="font-medium hover:underline">
                    {reading.formName}
                  </Link>
                  <span className="text-muted-foreground">
                    {showVisitDates && (
                      <>
                        Visit on <time dateTime={reading.visitedOn}>{formatDueDate(reading.visitedOn)}</time>
                        {reading.authorName && " · "}
                      </>
                    )}
                    {reading.authorName}
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
