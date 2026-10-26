import { describe, expect, it } from "vitest";

import { addDays, dueState, formatDueDate, parseDueDate, todayUtc } from "./due-dates";

const today = "2026-10-26";

describe("addDays", () => {
  it("moves across month ends, year ends, and leap days", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays(today, -1)).toBe("2026-10-25");
    expect(addDays("2026-12-29", 6)).toBe("2027-01-04");
    expect(addDays("2028-02-26", 6)).toBe("2028-03-03");
  });
});

describe("todayUtc", () => {
  it("is the UTC calendar day, even late in the evening west of UTC", () => {
    expect(todayUtc(new Date("2026-10-26T23:30:00-07:00"))).toBe("2026-10-27");
  });
});

describe("formatDueDate", () => {
  it("shows the calendar day itself, never shifted by the server's time zone", () => {
    expect(formatDueDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("leaves the year out of the short form only when it's the current year", () => {
    expect(formatDueDate("2026-11-02", "short", today)).toBe("Nov 2");
    expect(formatDueDate("2027-01-05", "short", today)).toBe("Jan 5, 2027");
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
  it("accepts a calendar date (trimmed), treats empty as no date, and missing as 'not on the form'", () => {
    expect(parseDueDate("2026-11-02")).toEqual({ ok: true, value: "2026-11-02" });
    expect(parseDueDate(" 2026-11-02 ")).toEqual({ ok: true, value: "2026-11-02" });
    expect(parseDueDate("  ")).toEqual({ ok: true, value: null });
    expect(parseDueDate(null)).toEqual({ ok: true, value: undefined });
  });

  it("accepts a leap day only in a leap year", () => {
    expect(parseDueDate("2028-02-29")).toEqual({ ok: true, value: "2028-02-29" });
    expect(parseDueDate("2026-02-29")).toEqual({ ok: false });
  });

  it.each(["2026-02-30", "next week", "2026-1-01", "0000-01-01", "0026-10-30", "1899-12-31", "3000-01-01"])(
    "rejects %s",
    (value) => {
      expect(parseDueDate(value)).toEqual({ ok: false });
    },
  );
});
