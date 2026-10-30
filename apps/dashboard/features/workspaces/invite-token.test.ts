import { describe, expect, it } from "vitest";

import {
  clearInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  inviteState,
  newInviteToken,
  readInviteToken,
  stashInviteToken,
} from "./invite-token";

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

/** A cookie jar that, like a browser, only deletes a cookie when the path matches the one it was set with. */
function fakeJar() {
  const cookies = new Map<string, { value: string; options: Record<string, unknown> }>();
  return {
    cookies,
    get: (name: string) => {
      const found = [...cookies.entries()].find(([key]) => key.startsWith(`${name}@`));
      return found ? { name, value: found[1].value } : undefined;
    },
    set: (cookie: { name: string; value: string; path?: string } & Record<string, unknown>) => {
      cookies.set(`${cookie.name}@${cookie.path ?? "/"}`, { value: cookie.value, options: cookie });
    },
    delete: (cookie: { name: string; path?: string }) => {
      cookies.delete(`${cookie.name}@${cookie.path ?? "/"}`);
    },
  };
}

describe("the invite cookie", () => {
  it("keeps the token httpOnly, same-site, only for the invite page, for a few minutes", () => {
    const jar = fakeJar();
    stashInviteToken(jar, "secret-token");
    const [stored] = [...jar.cookies.values()];
    expect(stored!.value).toBe("secret-token");
    expect(stored!.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/dashboard/invite" });
    expect(stored!.options.maxAge).toBeGreaterThan(0);
    expect(stored!.options.maxAge).toBeLessThanOrEqual(60 * 60);
  });

  it("gives the stashed token back", () => {
    const jar = fakeJar();
    stashInviteToken(jar, "secret-token");
    expect(readInviteToken(jar)).toBe("secret-token");
  });

  it("has no token once cleared", () => {
    const jar = fakeJar();
    stashInviteToken(jar, "secret-token");
    clearInviteToken(jar);
    expect(readInviteToken(jar)).toBeUndefined();
  });

  it("has no token when none was stashed", () => {
    expect(readInviteToken(fakeJar())).toBeUndefined();
  });
});
