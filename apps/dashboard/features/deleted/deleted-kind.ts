/**
 * What can be deleted and restored (design rule 8): every delete is soft, and the Deleted page lists these
 * kinds. Workspaces are still deleted for good, and invite links are revoked, not deleted.
 */
export const DELETED_KINDS = [
  { kind: "project", label: "Project" },
  { kind: "task", label: "Task" },
  { kind: "customer", label: "Customer" },
  { kind: "contact", label: "Contact" },
  { kind: "note", label: "Note" },
  { kind: "partner", label: "Partner" },
] as const;

export type DeletedKind = (typeof DELETED_KINDS)[number]["kind"];

export function parseDeletedKind(value: unknown): DeletedKind | null {
  return DELETED_KINDS.find((k) => k.kind === value)?.kind ?? null;
}

export function deletedKindLabel(kind: DeletedKind): string {
  return DELETED_KINDS.find((k) => k.kind === kind)!.label;
}
