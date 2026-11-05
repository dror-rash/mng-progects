import { describe, expect, it } from "vitest";

import { parseFieldInput, parseFormInput } from "./field-input";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseFormInput", () => {
  it("requires a name and keeps an empty description as null", () => {
    expect(parseFormInput(form({ name: "  " }))).toEqual({ ok: false, field: "name", error: "Form name is required" });
    expect(parseFormInput(form({ name: " Panel check ", description: " " }))).toEqual({
      ok: true,
      value: { name: "Panel check", description: null },
    });
  });

  it("keeps the name and description within their limits", () => {
    expect(parseFormInput(form({ name: "x".repeat(201) }))).toMatchObject({ ok: false, field: "name" });
    expect(parseFormInput(form({ name: "Form", description: "x".repeat(2001) }))).toMatchObject({ ok: false, field: "description" });
  });
});

describe("parseFieldInput", () => {
  it("reads a required number field with its unit", () => {
    expect(parseFieldInput(form({ label: " Voltage ", type: "number", unit: " V ", required: "on" }))).toEqual({
      ok: true,
      value: { label: "Voltage", type: "number", required: true, unit: "V", options: null },
    });
  });

  it("requires a label", () => {
    expect(parseFieldInput(form({ label: " ", type: "text" }))).toEqual({ ok: false, field: "label", error: "Field label is required" });
  });

  it("refuses a type that isn't offered", () => {
    expect(parseFieldInput(form({ label: "Photo", type: "photo" }))).toEqual({ ok: false, field: "type", error: "Choose a field type" });
  });

  it("keeps a unit only on number fields and options only on choice fields", () => {
    expect(parseFieldInput(form({ label: "Notes", type: "text", unit: "V", options: "A\nB" }))).toEqual({
      ok: true,
      value: { label: "Notes", type: "text", required: false, unit: null, options: null },
    });
  });

  it("reads a choice's options one per line, without blanks or repeats", () => {
    expect(parseFieldInput(form({ label: "Cable condition", type: "choice", options: " Good \r\n\nWorn\nGood\nDamaged\n" }))).toEqual({
      ok: true,
      value: { label: "Cable condition", type: "choice", required: false, unit: null, options: ["Good", "Worn", "Damaged"] },
    });
  });

  it("needs at least two options for a choice", () => {
    const error = { ok: false, field: "options", error: "Add at least two options, one per line" };
    expect(parseFieldInput(form({ label: "Cable condition", type: "choice", options: "Good" }))).toEqual(error);
    expect(parseFieldInput(form({ label: "Cable condition", type: "choice", options: "Good\nGood" }))).toEqual(error);
  });

  it("keeps the label, unit and options within their limits", () => {
    expect(parseFieldInput(form({ label: "x".repeat(201), type: "text" }))).toMatchObject({ ok: false, field: "label" });
    expect(parseFieldInput(form({ label: "Voltage", type: "number", unit: "x".repeat(51) }))).toMatchObject({ ok: false, field: "unit" });
    const many = Array.from({ length: 51 }, (_, i) => `Option ${i}`).join("\n");
    expect(parseFieldInput(form({ label: "Pick", type: "choice", options: many }))).toMatchObject({ ok: false, field: "options" });
    expect(parseFieldInput(form({ label: "Pick", type: "choice", options: `A\n${"x".repeat(201)}` }))).toMatchObject({ ok: false, field: "options" });
  });
});
