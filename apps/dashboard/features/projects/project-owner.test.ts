import { describe, expect, it } from "vitest";

import { INTERNAL_OWNER, parseProjectOwner, projectOwnerValue } from "./project-owner";

describe("parseProjectOwner", () => {
  it("reads Internal as a project without a partner", () => {
    expect(parseProjectOwner(INTERNAL_OWNER)).toEqual({ visibility: "internal", partnerId: null });
  });

  it("reads any other value as a partner's id", () => {
    expect(parseProjectOwner(" p-1 ")).toEqual({ visibility: "partner", partnerId: "p-1" });
  });

  it("reads a form without an Owner select (no partners yet) as internal", () => {
    expect(parseProjectOwner(null)).toEqual({ visibility: "internal", partnerId: null });
  });

  it("rejects a blank owner", () => {
    expect(parseProjectOwner("  ")).toBeNull();
  });
});

describe("projectOwnerValue", () => {
  it("is the select value for a project's owner", () => {
    expect(projectOwnerValue(null)).toBe(INTERNAL_OWNER);
    expect(projectOwnerValue("p-1")).toBe("p-1");
  });
});
