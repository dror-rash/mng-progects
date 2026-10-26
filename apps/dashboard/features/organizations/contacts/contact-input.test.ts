import { describe, expect, it } from "vitest";

import { parseContactInput } from "./contact-input";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseContactInput", () => {
  it("trims fields and stores empty ones as null", () => {
    expect(parseContactInput(form({ name: " Dana Levi ", role: "Head of Marketing ", phone: "", email: " " }))).toEqual({
      ok: true,
      value: { name: "Dana Levi", role: "Head of Marketing", phone: null, email: null },
    });
  });

  it("requires a name", () => {
    expect(parseContactInput(form({ name: "  " }))).toEqual({ ok: false, field: "name", error: "Contact name is required" });
  });

  it("rejects an invalid email", () => {
    expect(parseContactInput(form({ name: "Dana", email: "dana@" }))).toEqual({
      ok: false,
      field: "email",
      error: "Enter a valid email address",
    });
  });
});
