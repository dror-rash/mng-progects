import { createHash, randomBytes } from "node:crypto";

const VALID_DAYS = 7;

/** 32 random bytes as base64url: shown once in the link, never stored. */
export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What the database keeps, so a leaked database doesn't leak working links. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(now: Date): Date {
  return new Date(now.getTime() + VALID_DAYS * 24 * 60 * 60 * 1000);
}

export function inviteState(
  invite: { expiresAt: Date; revokedAt: Date | null },
  now: Date,
): "valid" | "expired" | "revoked" {
  if (invite.revokedAt) return "revoked";
  return now.getTime() < invite.expiresAt.getTime() ? "valid" : "expired";
}
