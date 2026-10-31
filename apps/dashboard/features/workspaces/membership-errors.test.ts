import { describe, expect, it } from "vitest";

import { ADMINS_ONLY, LAST_ADMIN, membershipError, NOT_A_MEMBER } from "./membership-errors";

describe("membershipError", () => {
  it("has no error when the change was made", () => {
    expect(membershipError("done")).toBeUndefined();
  });

  it("explains that a workspace keeps an admin", () => {
    expect(membershipError("last-admin")).toBe("A workspace needs at least one admin");
    expect(LAST_ADMIN).toBe("A workspace needs at least one admin");
  });

  it("explains that the person is no longer a member", () => {
    expect(membershipError("not-a-member")).toBe("Not a member of this workspace");
    expect(NOT_A_MEMBER).toBe("Not a member of this workspace");
  });

  it("explains that only admins manage the workspace", () => {
    expect(membershipError("not-an-admin")).toBe("Only admins can manage this workspace");
    expect(ADMINS_ONLY).toBe("Only admins can manage this workspace");
  });

  it("explains that the partner isn't one of the workspace's", () => {
    expect(membershipError("unknown-partner")).toBe("Choose a partner of this workspace");
  });
});
