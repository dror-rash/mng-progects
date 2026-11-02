import { describe, expect, it } from "vitest";

import { parseVisitInput } from "./visit-input";

const today = "2026-11-02";
const visitId = "0b9c3f0e-7a51-4d3a-9a8e-2f6f4c1d2e3f";

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
}

describe("parseVisitInput", () => {
  it("reads the client id, date, people and trimmed notes", () => {
    expect(
      parseVisitInput(form({ visitId, visitedOn: "2026-10-30", memberIds: ["u1", "u2", "u1"], notes: "  Panel replaced  " }), today),
    ).toEqual({ ok: true, value: { visitId, visitedOn: "2026-10-30", memberIds: ["u1", "u2"], notes: "Panel replaced" } });
  });

  it("stores empty notes as null and takes today", () => {
    const parsed = parseVisitInput(form({ visitId, visitedOn: today, memberIds: "u1", notes: " " }), today);
    expect(parsed.ok && parsed.value.notes).toBeNull();
  });

  it("refuses a missing or made-up date, and a future one", () => {
    expect(parseVisitInput(form({ visitId, visitedOn: "", memberIds: "u1" }), today)).toEqual({
      ok: false,
      field: "visitedOn",
      error: "Choose the visit's date",
    });
    expect(parseVisitInput(form({ visitId, visitedOn: "2026-02-30", memberIds: "u1" }), today)).toMatchObject({ field: "visitedOn" });
    expect(parseVisitInput(form({ visitId, visitedOn: "2026-11-03", memberIds: "u1" }), today)).toEqual({
      ok: false,
      field: "visitedOn",
      error: "A visit can't be in the future",
    });
  });

  it("needs someone who was there", () => {
    expect(parseVisitInput(form({ visitId, visitedOn: today }), today)).toEqual({
      ok: false,
      field: "memberIds",
      error: "Choose who was there",
    });
  });

  it("needs a client id that is a UUID", () => {
    expect(() => parseVisitInput(form({ visitId: "not-a-uuid", visitedOn: today, memberIds: "u1" }), today)).toThrow();
  });
});
