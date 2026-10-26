import { describe, expect, it } from "vitest";

import { addDays, dueState, parseDueDate } from "./due-dates";

const today = "2026-10-26";

describe("addDays", () => {
  it("moves across month ends", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays(today, -1)).toBe("2026-10-25");
  });
});

describe("dueState", () => {
  it.each([
    ["2026-10-25", "todo", "overdue"],
    ["2026-10-26", "todo", "due-soon"],
    ["2026-11-01", "in_progress", "due-soon"],
    ["2026-11-02", "todo", "later"],
  ] as const)("a task due %s with status %s is %s", (due, status, expected) => {
    expect(dueState(due, status, today)).toBe(expected);
  });

  it("is null for a done task, even past its date", () => {
    expect(dueState("2026-01-01", "done", today)).toBeNull();
  });

  it("is null without a due date", () => {
    expect(dueState(null, "todo", today)).toBeNull();
  });
});

describe("parseDueDate", () => {
  it("accepts a calendar date, treats empty as no date, and missing as 'not on the form'", () => {
    expect(parseDueDate("2026-11-02")).toBe("2026-11-02");
    expect(parseDueDate("")).toBeNull();
    expect(parseDueDate(null)).toBeUndefined();
  });

  it("rejects anything that isn't a real date", () => {
    expect(parseDueDate("2026-02-30")).toBe("invalid");
    expect(parseDueDate("next week")).toBe("invalid");
  });
});
