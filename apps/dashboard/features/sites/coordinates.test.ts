import { describe, expect, it } from "vitest";

import { formatCoordinate } from "./coordinates";

describe("formatCoordinate", () => {
  it("drops the trailing zeros the database keeps", () => {
    expect(formatCoordinate("32.800000")).toBe("32.8");
    expect(formatCoordinate("35.000000")).toBe("35");
    expect(formatCoordinate("-0.123456")).toBe("-0.123456");
  });

  it("is empty without a value", () => {
    expect(formatCoordinate(null)).toBe("");
    expect(formatCoordinate(undefined)).toBe("");
  });
});
