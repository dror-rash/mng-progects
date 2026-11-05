import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { ReactNode } from "react";

import { formatSize } from "./format-size";

type Report = {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploaderName: string | null;
  uploadedAt: Date;
  canDelete: boolean;
};

const STAMP = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

/**
 * A project's uploaded reports (task 064): each by name (downloaded through `/attachments/<id>`, which
 * checks access), size, who uploaded it and when, newest first. The `uploader` (for those who can work on
 * the project) and `deleteAction` come from the page; a report's Delete shows to its uploader and admins.
 */
export function ReportsSection({
  projectId,
  reports,
  uploader,
  deleteAction,
}: {
  projectId: string;
  reports: Report[];
  uploader?: ReactNode;
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <section aria-labelledby="reports-heading">
      <input type="hidden" name="projectId" value={projectId} />
      <Card>
        <CardHeader>
          <CardTitle id="reports-heading" className="text-base">Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {uploader}
          {reports.length === 0 ? (
            <p className="text-muted-foreground">No reports yet.</p>
          ) : (
            <ul className="divide-y">
              {reports.map((report) => (
                <li key={report.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="space-y-0.5">
                    <a href={`/dashboard/attachments/${report.id}`} className="font-medium hover:underline">{report.fileName}</a>
                    <div className="text-xs text-muted-foreground">
                      {formatSize(report.sizeBytes)}
                      {report.uploaderName && <> · {report.uploaderName}</>}
                      {" · "}
                      <time dateTime={report.uploadedAt.toISOString()}>{STAMP.format(report.uploadedAt)}</time>
                    </div>
                  </div>
                  {deleteAction && report.canDelete && (
                    <form action={deleteAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="attachmentId" value={report.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Delete<span className="sr-only"> {report.fileName}</span>
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
