import { describe, expect, it } from "vitest";

import { firstParam, withParams } from "./search-params";

describe("firstParam", () => {
  it("takes the first of a repeated parameter", () => {
    expect(firstParam(["retail", "b2b"])).toBe("retail");
  });

  it("trims a single value and treats blank as missing", () => {
    expect(firstParam(" retail ")).toBe("retail");
    expect(firstParam("  ")).toBeUndefined();
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe("withParams", () => {
  it("builds a link that keeps the other filters and drops empty ones", () => {
    expect(withParams("/customers", { status: "active", tag: "retail" })).toBe("/customers?status=active&tag=retail");
    expect(withParams("/customers", { status: undefined, tag: "b2b & co" })).toBe("/customers?tag=b2b+%26+co");
    expect(withParams("/customers", {})).toBe("/customers");
  });
});
