/**
 * A project's owner (ADR-0006 rule 4): internal (admins and auditors only) or one partner company. Admins
 * choose it on the new project page; a partner's users always create their own partner's projects. It
 * never changes afterwards (rule 4a).
 */
export type ProjectOwner = { visibility: "internal"; partnerId: null } | { visibility: "partner"; partnerId: string };

/** The Owner select's value for an internal project; any other value is a partner's id. */
export const INTERNAL_OWNER = "internal";

/**
 * The Owner select's value, or null for a blank one. A form without the select (a workspace without
 * partners) means internal. The server still checks the partner is the workspace's.
 */
export function parseProjectOwner(value: unknown): ProjectOwner | null {
  if (value === null || value === undefined) return { visibility: "internal", partnerId: null };
  const owner = typeof value === "string" ? value.trim() : "";
  if (!owner) return null;
  return owner === INTERNAL_OWNER ? { visibility: "internal", partnerId: null } : { visibility: "partner", partnerId: owner };
}

/** The Owner select's value for a project's `partnerId` (null: internal). */
export function projectOwnerValue(partnerId: string | null): string {
  return partnerId ?? INTERNAL_OWNER;
}
