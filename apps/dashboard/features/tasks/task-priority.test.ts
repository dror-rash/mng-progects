import { describe, expect, it } from "vitest";

import { byPriority, parseTaskPriority, priorityLabel, TASK_PRIORITIES } from "./task-priority";

describe("TASK_PRIORITIES", () => {
  it("lists priorities from most to least urgent", () => {
    expect(TASK_PRIORITIES.map((p) => p.label)).toEqual(["High", "Medium", "Low"]);
  });
});

describe("parseTaskPriority", () => {
  it("accepts a known priority and rejects anything else", () => {
    expect(parseTaskPriority("high")).toBe("high");
    expect(parseTaskPriority("urgent")).toBeNull();
    expect(parseTaskPriority(null)).toBeNull();
  });
});

describe("priorityLabel", () => {
  it("names the priority, treating an unknown stored value as Medium", () => {
    expect(priorityLabel("low")).toBe("Low");
    expect(priorityLabel("legacy")).toBe("Medium");
  });
});

describe("byPriority", () => {
  it("sorts high before medium before low and keeps the original order within a priority", () => {
    const tasks = [
      { id: "1", priority: "low" },
      { id: "2", priority: "medium" },
      { id: "3", priority: "high" },
      { id: "4", priority: "medium" },
      { id: "5", priority: "legacy" },
    ];

    expect([...tasks].sort(byPriority).map((t) => t.id)).toEqual(["3", "2", "4", "5", "1"]);
  });
});
