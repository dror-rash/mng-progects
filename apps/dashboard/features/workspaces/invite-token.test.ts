import { describe, expect, it } from "vitest";

import { hashInviteToken, inviteExpiresAt, inviteState, newInviteToken } from "./invite-token";

describe("newInviteToken", () => {
  it("is a long URL-safe random string, different every time", () => {
    const a = newInviteToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newInviteToken()).not.toBe(a);
  });
});

describe("hashInviteToken", () => {
  it("is a stable SHA-256 hex digest, so only the hash needs storing", () => {
    expect(hashInviteToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("inviteExpiresAt", () => {
  it("is seven days later", () => {
    expect(inviteExpiresAt(new Date("2026-10-26T12:00:00Z")).toISOString()).toBe("2026-11-02T12:00:00.000Z");
  });
});

describe("inviteState", () => {
  const now = new Date("2026-10-26T12:00:00Z");

  it("is usable before it expires and while not revoked", () => {
    expect(inviteState({ expiresAt: new Date("2026-10-27T00:00:00Z"), revokedAt: null }, now)).toBe("valid");
  });

  it("is expired at or after the expiry time", () => {
    expect(inviteState({ expiresAt: now, revokedAt: null }, now)).toBe("expired");
  });

  it("is revoked once revoked, whatever the expiry", () => {
    expect(inviteState({ expiresAt: new Date("2026-11-01T00:00:00Z"), revokedAt: now }, now)).toBe("revoked");
  });
});
