import "server-only";

import { createHash, randomBytes } from "node:crypto";

const VALID_DAYS = 7;

/**
 * The link's token is moved into this cookie as soon as the link is opened, so it never travels in a
 * login URL's `next=`, a `Referer` or the address bar (task 028). Only the invite page gets it, briefly.
 */
const INVITE_COOKIE = "invite_token";
const INVITE_COOKIE_PATH = "/dashboard/invite";
const INVITE_COOKIE_MINUTES = 30;

/** The parts of Next's request/response cookie stores used here. */
type CookieJar = {
  get(name: string): { value: string } | undefined;
  set(cookie: { name: string; value: string; httpOnly: boolean; sameSite: "lax"; secure: boolean; path: string; maxAge: number }): unknown;
  delete(cookie: { name: string; path: string }): unknown;
};

export function stashInviteToken(jar: CookieJar, token: string) {
  jar.set({
    name: INVITE_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: INVITE_COOKIE_PATH,
    maxAge: INVITE_COOKIE_MINUTES * 60,
  });
}

export function readInviteToken(jar: CookieJar): string | undefined {
  return jar.get(INVITE_COOKIE)?.value || undefined;
}

export function clearInviteToken(jar: CookieJar) {
  jar.delete({ name: INVITE_COOKIE, path: INVITE_COOKIE_PATH });
}

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
