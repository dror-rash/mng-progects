import { describe, expect, it } from "vitest";

import { PARTNER_NAME_MAX_LENGTH, parsePartnerName } from "./partner-name";

describe("parsePartnerName", () => {
  it("trims surrounding whitespace", () => {
    expect(parsePartnerName("  Northwind ")).toEqual({ ok: true, name: "Northwind" });
  });

  it("requires a name", () => {
    expect(parsePartnerName("   ")).toEqual({ ok: false, field: "name", error: "Enter a name" });
    expect(parsePartnerName(null)).toEqual({ ok: false, field: "name", error: "Enter a name" });
  });

  it("accepts a name of exactly 100 characters", () => {
    expect(parsePartnerName("x".repeat(100))).toEqual({ ok: true, name: "x".repeat(100) });
  });

  it("rejects a name of more than 100 characters", () => {
    expect(parsePartnerName("x".repeat(101))).toEqual({ ok: false, field: "name", error: "Use at most 100 characters" });
  });

  it("exports the limit the input uses", () => {
    expect(PARTNER_NAME_MAX_LENGTH).toBe(100);
  });
});
