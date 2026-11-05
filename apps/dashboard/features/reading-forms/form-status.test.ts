import { describe, expect, it } from "vitest";

import { FORM_STATUSES, formStatusLabel, formStatusOf } from "./form-status";

describe("form statuses", () => {
  it("are Draft, Published and Archived, in that order", () => {
    expect(FORM_STATUSES.map((s) => s.label)).toEqual(["Draft", "Published", "Archived"]);
  });

  it("reads a stored status, and an unknown one as Archived, which nobody can change", () => {
    expect(formStatusOf("published")).toBe("published");
    expect(formStatusOf("retired")).toBe("archived");
  });

  it("labels a status", () => {
    expect(formStatusLabel("draft")).toBe("Draft");
  });
});
