import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";
import type { ReactNode } from "react";

import { visitName } from "@/features/visits/visit-name";

import { formatSize } from "./format-size";

type Item = {
  id: string;
  kind: string;
  fileName: string;
  sizeBytes: number;
  uploaderName: string | null;
  visitId: string | null;
  visitedOn: string | null;
  visitNotes: string | null;
  canDelete: boolean;
};

/**
 * A project's or a visit's photos and files (task 059): photos as thumbnails, files by name and size, each
 * opened through `/attachments/<id>` (which checks access). On the project page, the visit each came from.
 * The `uploader` (for those who can work on the project) and `deleteAction` come from the page.
 */
export function AttachmentsSection({
  projectId,
  items,
  showVisits,
  uploader,
  deleteAction,
}: {
  projectId: string;
  items: Item[];
  showVisits: boolean;
  uploader?: ReactNode;
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  const photos = items.filter((i) => i.kind === "photo");
  const files = items.filter((i) => i.kind !== "photo");
  const from = (item: Item) =>
    showVisits && item.visitId && item.visitedOn ? (
      <Link href={`/projects/${projectId}/visits/${item.visitId}`} className="hover:underline">
        {visitName(item.visitNotes, item.visitedOn)}
      </Link>
    ) : null;
  const remove = (item: Item) =>
    deleteAction && item.canDelete ? (
      <form action={deleteAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="attachmentId" value={item.id} />
        <Button type="submit" variant="ghost" size="sm">
          Delete<span className="sr-only"> {item.fileName}</span>
        </Button>
      </form>
    ) : null;

  return (
    <section aria-labelledby="attachments-heading">
      <input type="hidden" name="projectId" value={projectId} />
      <Card>
        <CardHeader>
          <CardTitle id="attachments-heading" className="text-base">Photos and files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {uploader}
          {items.length === 0 ? (
            <p className="text-muted-foreground">No photos or files yet.</p>
          ) : (
            <div className="space-y-4">
              {photos.length > 0 && (
                <ul aria-label="Photos" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((photo) => (
                    <li key={photo.id} className="space-y-1">
                      <a href={`/dashboard/attachments/${photo.id}`} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={`/dashboard/attachments/${photo.id}`} alt={photo.fileName} className="aspect-square w-full rounded-md border object-cover" />
                      </a>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 text-xs text-muted-foreground">
                          <span className="block truncate text-foreground">{photo.fileName}</span>
                          {from(photo)}
                        </div>
                        {remove(photo)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {files.length > 0 && (
                <ul aria-label="Files" className="divide-y">
                  {files.map((file) => (
                    <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div className="space-y-0.5">
                        <a href={`/dashboard/attachments/${file.id}`} className="font-medium hover:underline">{file.fileName}</a>
                        <div className="text-xs text-muted-foreground">
                          {formatSize(file.sizeBytes)}
                          {from(file) && <> · {from(file)}</>}
                        </div>
                      </div>
                      {remove(file)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
