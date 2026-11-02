import { getSession } from "@repo/auth/server";
import { createDownloadUrl } from "@repo/storage";

import { getOpenableAttachment } from "@/features/attachments/queries";

/**
 * Opens a photo or file (task 059): for whoever may see it, a redirect to a short-lived signed storage URL
 * (photos inline, files saved under their name). Everything else (signed out, another partner's, unconfirmed,
 * deleted, made up) is the same 404, so the address tells nothing.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const session = await getSession();
  if (!session) {
    return notFound();
  }
  const { attachmentId } = await params;
  const attachment = await getOpenableAttachment(session.user.id, attachmentId);
  if (!attachment) {
    return notFound();
  }
  const url = await createDownloadUrl({
    key: attachment.storageKey,
    ...(attachment.kind !== "photo" && { fileName: attachment.fileName }),
  });
  return new Response(null, { status: 307, headers: { Location: url, "Cache-Control": "private, no-store" } });
}
