import { describe, expect, it } from "vitest";

import { FIELD_TYPES, fieldTypeLabel, parseFieldType } from "./field-type";

describe("field types", () => {
  it("offers Number, Text, Yes/no, Choice and Date, in that order", () => {
    expect(FIELD_TYPES.map((t) => t.label)).toEqual(["Number", "Text", "Yes/no", "Choice", "Date"]);
  });

  it("parses a known type and refuses anything else", () => {
    expect(parseFieldType("yes_no")).toBe("yes_no");
    expect(parseFieldType("photo")).toBeNull();
    expect(parseFieldType(null)).toBeNull();
  });

  it("labels a stored type, and an unknown one as Text", () => {
    expect(fieldTypeLabel("choice")).toBe("Choice");
    expect(fieldTypeLabel("photo")).toBe("Text");
  });
});
