export type ReadingRow = { id: string; visitId: string; formName: string; visitedOn: string; authorName: string | null };

export function ReadingsSection(_props: { projectId: string; readings: ReadingRow[]; showVisitDates: boolean; addHref?: string }) {
  return null;
}
