"use client";

import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { acceptFor, type AttachmentKind } from "./attachment-limits";
import { finishUploadAction, startUploadAction } from "./actions";

/**
 * "Add photos" and "Add files" (task 059): each file goes straight to storage through a signed URL, one
 * after another, then the server confirms it. On phones "Add photos" opens the camera or the library. The
 * project comes from the section's hidden `projectId` field, so the page and the form agree on it.
 */
export function AttachmentUploader({ visitId }: { visitId: string | null }) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(kind: AttachmentKind, file: File) {
    const projectId = container.current?.closest("section")?.querySelector<HTMLInputElement>('input[name="projectId"]')?.value ?? "";
    const attachmentId = crypto.randomUUID();
    try {
      const start = await startUploadAction({
        attachmentId,
        projectId,
        visitId,
        kind,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });
      if (!start.ok) return start.error;
      const sent = await fetch(start.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!sent.ok) return `Couldn't add ${file.name}. Try again.`;
      const finish = await finishUploadAction({ attachmentId });
      return finish.ok ? null : `Couldn't add ${file.name}: ${finish.error}`;
    } catch {
      return `Couldn't add ${file.name}. Try again.`;
    }
  }

  async function addAll(kind: AttachmentKind, input: HTMLInputElement) {
    const files = [...(input.files ?? [])];
    input.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    const added: string[] = [];
    for (const file of files) {
      setStatus(`Adding ${file.name}…`);
      const failed = await upload(kind, file);
      if (failed) {
        setError(failed);
        break;
      }
      added.push(file.name);
    }
    setStatus(added.length > 0 ? `Added ${added.join(", ")}` : null);
    setBusy(false);
    router.refresh();
  }

  const picker = (kind: AttachmentKind, label: string) => (
    <>
      <input
        type="file"
        aria-label={label}
        accept={acceptFor(kind)}
        {...(kind === "photo" && { capture: "environment" as const })}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => addAll(kind, e.currentTarget)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement).click()}
      >
        {label}
      </Button>
    </>
  );

  return (
    <div ref={container} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {picker("photo", "Add photos")}
        {picker("file", "Add files")}
      </div>
      <p role="status" className="text-xs text-muted-foreground">{status}</p>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}
