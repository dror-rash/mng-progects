import { describe, expect, it } from "vitest";

import { byDueThenPriority } from "./my-tasks";

describe("byDueThenPriority", () => {
  it("puts the soonest due date first, undated tasks last, then the most urgent", () => {
    const tasks = [
      { id: "undated-high", dueDate: null, priority: "high" },
      { id: "nov-low", dueDate: "2026-11-02", priority: "low" },
      { id: "oct", dueDate: "2026-10-30", priority: "medium" },
      { id: "nov-high", dueDate: "2026-11-02", priority: "high" },
      { id: "undated-low", dueDate: null, priority: "low" },
    ];

    expect([...tasks].sort(byDueThenPriority).map((t) => t.id)).toEqual([
      "oct",
      "nov-high",
      "nov-low",
      "undated-high",
      "undated-low",
    ]);
  });

  it("breaks ties by creation time, then by id", () => {
    const same = { dueDate: "2026-11-02", priority: "medium" };
    const tasks = [
      { ...same, id: "later", createdAt: new Date("2026-10-30T10:00:00Z") },
      { ...same, id: "b", createdAt: new Date("2026-10-30T09:00:00Z") },
      { ...same, id: "a", createdAt: new Date("2026-10-30T09:00:00Z") },
    ];

    expect([...tasks].sort(byDueThenPriority).map((t) => t.id)).toEqual(["a", "b", "later"]);
  });
});
