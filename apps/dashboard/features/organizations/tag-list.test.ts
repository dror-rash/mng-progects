import { describe, expect, it } from "vitest";

import { distinctTags, sameTag } from "./tag-list";

describe("distinctTags", () => {
  it("merges tags that differ only in case, keeping the first spelling, sorted", () => {
    expect(distinctTags([["Retail", "b2b"], ["retail"], ["Enterprise"]])).toEqual(["b2b", "Enterprise", "Retail"]);
  });
});

describe("sameTag", () => {
  it("compares tags without regard to case", () => {
    expect(sameTag("Retail", "retail")).toBe(true);
    expect(sameTag("Retail", "retailer")).toBe(false);
    expect(sameTag(undefined, "retail")).toBe(false);
  });
});
