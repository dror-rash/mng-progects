import { describe, expect, it } from "vitest";

import { cleanText } from "./clean-text";

describe("cleanText", () => {
  it("trims and removes control characters but keeps line breaks", () => {
    expect(cleanText("  a\u0000b\nc\u0007 ")).toBe("ab\nc");
  });

  it("treats a missing value as empty", () => {
    expect(cleanText(null)).toBe("");
  });
});
