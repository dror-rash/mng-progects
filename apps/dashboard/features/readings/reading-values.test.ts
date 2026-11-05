import { describe, expect, it } from "vitest";

import { fieldInputName, parseReadingValues, type ReadingField, readingValueText } from "./reading-values";

const voltage: ReadingField = { id: "f1", label: "Voltage", type: "number", required: true, unit: "V", options: null };
const trips: ReadingField = { id: "f2", label: "Breaker trips", type: "yes_no", required: false, unit: null, options: null };
const condition: ReadingField = {
  id: "f3",
  label: "Cable condition",
  type: "choice",
  required: false,
  unit: null,
  options: ["Good", "Worn", "Damaged"],
};
const remarks: ReadingField = { id: "f4", label: "Remarks", type: "text", required: false, unit: null, options: null };
const checkedOn: ReadingField = { id: "f5", label: "Checked on", type: "date", required: false, unit: null, options: null };
const fields = [voltage, trips, condition, remarks, checkedOn];

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [id, value] of Object.entries(values)) data.set(fieldInputName(id), value);
  return data;
}

describe("parseReadingValues", () => {
  it("reads each type into its stored value, keyed by field id", () => {
    const result = parseReadingValues(
      form({ f1: " 230.5 ", f2: "yes", f3: "Worn", f4: "  Looks fine ", f5: "2026-11-02" }),
      fields,
    );
    expect(result).toEqual({ ok: true, value: { f1: 230.5, f2: true, f3: "Worn", f4: "Looks fine", f5: "2026-11-02" } });
  });

  it("reads No as false", () => {
    expect(parseReadingValues(form({ f1: "1", f2: "no" }), fields)).toEqual({ ok: true, value: { f1: 1, f2: false } });
  });

  it("leaves out optional fields left empty, or not sent at all", () => {
    expect(parseReadingValues(form({ f1: "-4", f3: "", f4: "   " }), fields)).toEqual({ ok: true, value: { f1: -4 } });
  });

  it("refuses a required field left empty, on that field", () => {
    expect(parseReadingValues(form({ f1: "  ", f3: "Worn" }), fields)).toEqual({
      ok: false,
      field: fieldInputName("f1"),
      error: "Voltage is required",
    });
    expect(parseReadingValues(form({}), fields)).toMatchObject({ ok: false, error: "Voltage is required" });
  });

  it("refuses something that isn't a number", () => {
    for (const value of ["abc", "12abc", "1,5", "Infinity", "0x10", "1e999"]) {
      expect(parseReadingValues(form({ f1: value }), fields)).toEqual({
        ok: false,
        field: fieldInputName("f1"),
        error: "Voltage must be a number",
      });
    }
  });

  it("refuses a choice that isn't one of the options", () => {
    expect(parseReadingValues(form({ f1: "1", f3: "Rusty" }), fields)).toEqual({
      ok: false,
      field: fieldInputName("f3"),
      error: "Choose Cable condition from the list",
    });
  });

  it("refuses a Yes/no answer other than Yes or No", () => {
    expect(parseReadingValues(form({ f1: "1", f2: "maybe" }), fields)).toEqual({
      ok: false,
      field: fieldInputName("f2"),
      error: "Choose Yes or No for Breaker trips",
    });
  });

  it("refuses a date that isn't a calendar day", () => {
    for (const value of ["2026-02-30", "02/11/2026", "tomorrow"]) {
      expect(parseReadingValues(form({ f1: "1", f5: value }), fields)).toEqual({
        ok: false,
        field: fieldInputName("f5"),
        error: "Checked on must be a date",
      });
    }
  });

  it("refuses text longer than the limit", () => {
    expect(parseReadingValues(form({ f1: "1", f4: "x".repeat(5001) }), fields)).toEqual({
      ok: false,
      field: fieldInputName("f4"),
      error: "Keep Remarks under 5000 characters",
    });
  });

  it("ignores values for fields the version doesn't have", () => {
    expect(parseReadingValues(form({ f1: "1", other: "x" }), fields)).toEqual({ ok: true, value: { f1: 1 } });
  });

  it("treats a field of a type it doesn't know as text", () => {
    const odd: ReadingField = { id: "f9", label: "Odd", type: "photo", required: false, unit: null, options: null };
    expect(parseReadingValues(form({ f9: " a " }), [odd])).toEqual({ ok: true, value: { f9: "a" } });
  });
});

describe("readingValueText", () => {
  it("shows a number with its unit, or alone", () => {
    expect(readingValueText(voltage, 230)).toBe("230 V");
    expect(readingValueText({ ...voltage, unit: null }, 4.5)).toBe("4.5");
  });

  it("shows Yes/no, choices, text and dates", () => {
    expect(readingValueText(trips, true)).toBe("Yes");
    expect(readingValueText(trips, false)).toBe("No");
    expect(readingValueText(condition, "Worn")).toBe("Worn");
    expect(readingValueText(remarks, "Looks fine")).toBe("Looks fine");
    expect(readingValueText(checkedOn, "2026-11-02")).toBe("Nov 2, 2026");
  });

  it("shows an empty field as not filled in", () => {
    for (const field of fields) {
      expect(readingValueText(field, undefined)).toBe("Not filled in");
      expect(readingValueText(field, null)).toBe("Not filled in");
    }
  });

  it("shows a stored value of an unexpected shape as text", () => {
    expect(readingValueText(voltage, "230")).toBe("230");
    expect(readingValueText(checkedOn, "not a date")).toBe("not a date");
  });
});
