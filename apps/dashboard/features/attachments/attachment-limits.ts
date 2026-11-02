/**
 * What may be uploaded (task 059). The limits are *my call* until the owner answers open question 3 (sizes,
 * counts, retention); 20 MB covers phone photos. The server checks them before signing an upload and again
 * on the stored object.
 */
export const ATTACHMENT_KINDS = ["photo", "file"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export function parseAttachmentKind(value: unknown): AttachmentKind | null {
  return ATTACHMENT_KINDS.find((k) => k === value) ?? null;
}

const MB = 1024 * 1024;

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const FILE_TYPES = [
  ...PHOTO_TYPES,
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const LIMITS: Record<AttachmentKind, { types: string[]; maxBytes: number; typeError: string; sizeError: string }> = {
  photo: {
    types: PHOTO_TYPES,
    maxBytes: 20 * MB,
    typeError: "Photos must be JPEG, PNG, WebP or HEIC images",
    sizeError: "Photos can be up to 20 MB",
  },
  file: {
    types: FILE_TYPES,
    maxBytes: 50 * MB,
    typeError: "Files must be PDF, Word, Excel, CSV, text or images",
    sizeError: "Files can be up to 50 MB",
  },
};

/** The accept attribute for a kind's file picker. */
export function acceptFor(kind: AttachmentKind): string {
  return LIMITS[kind].types.join(",");
}

/** Why an upload of `kind` with this content type and size is refused, or null when it fits. */
export function uploadRefusal(kind: AttachmentKind, contentType: string, sizeBytes: number): string | null {
  const limits = LIMITS[kind];
  if (!limits.types.includes(contentType.toLowerCase())) return limits.typeError;
  if (sizeBytes <= 0) return "The file is empty";
  if (sizeBytes > limits.maxBytes) return limits.sizeError;
  return null;
}
