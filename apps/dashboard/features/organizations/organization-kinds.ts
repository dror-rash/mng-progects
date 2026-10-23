/**
 * Kinds of organization in the directory (ADR-0004). Add a kind here, then give it pages;
 * project and task links work for every kind without a schema change.
 */
export const ORGANIZATION_KINDS = [{ kind: "customer", label: "Customer", plural: "Customers" }] as const;

export type OrganizationKind = (typeof ORGANIZATION_KINDS)[number]["kind"];

/** Relationship status, shared by every kind, in lifecycle order. */
export const ORGANIZATION_STATUSES = [
  { status: "lead", label: "Lead" },
  { status: "active", label: "Active" },
  { status: "past", label: "Past" },
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number]["status"];

export function parseOrganizationStatus(value: unknown): OrganizationStatus | null {
  return ORGANIZATION_STATUSES.find((s) => s.status === value)?.status ?? null;
}

export function organizationStatusLabel(value: string): string {
  return ORGANIZATION_STATUSES.find((s) => s.status === value)?.label ?? value;
}
