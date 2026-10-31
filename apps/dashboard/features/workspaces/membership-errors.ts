export const LAST_ADMIN = "A workspace needs at least one admin";
export const ADMINS_ONLY = "Only admins can manage this workspace";
export const NOT_A_MEMBER = "Not a member of this workspace";
export const UNKNOWN_PARTNER = "Choose a partner of this workspace";

/** What a membership change can come to (see `changeMembership` in `actions.ts`). */
export type MembershipResult = "done" | "not-a-member" | "not-an-admin" | "last-admin" | "unknown-partner";

const MESSAGES: Record<Exclude<MembershipResult, "done">, string> = {
  "not-a-member": NOT_A_MEMBER,
  "not-an-admin": ADMINS_ONLY,
  "last-admin": LAST_ADMIN,
  "unknown-partner": UNKNOWN_PARTNER,
};

/** The message to show for a membership change, or undefined when it was made. */
export function membershipError(result: MembershipResult): string | undefined {
  return result === "done" ? undefined : MESSAGES[result];
}
