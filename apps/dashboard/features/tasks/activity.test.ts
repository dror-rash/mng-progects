import { describe, expect, it } from "vitest";

import { countThisWeek, nextCompletedAt } from "./activity";

const now = new Date("2026-10-22T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("countThisWeek", () => {
  it("counts tasks created and completed in the last seven days", () => {
    const tasks = [
      { createdAt: daysAgo(1), completedAt: daysAgo(0.5) },
      { createdAt: daysAgo(3), completedAt: null },
      { createdAt: daysAgo(10), completedAt: daysAgo(2) },
    ];

    expect(countThisWeek(tasks, now)).toEqual({ created: 2, completed: 2 });
  });

  it("leaves out anything older than seven days", () => {
    const tasks = [{ createdAt: daysAgo(7.01), completedAt: daysAgo(8) }];

    expect(countThisWeek(tasks, now)).toEqual({ created: 0, completed: 0 });
  });

  it("includes something exactly seven days old", () => {
    expect(countThisWeek([{ createdAt: daysAgo(7), completedAt: daysAgo(7) }], now)).toEqual({ created: 1, completed: 1 });
  });

  it("ignores tasks that were never completed", () => {
    expect(countThisWeek([{ createdAt: daysAgo(30), completedAt: null }], now).completed).toBe(0);
  });
});

describe("countThisWeek with clock skew", () => {
  it("counts a task stamped slightly after now (database clock ahead of the app)", () => {
    const aheadOfNow = new Date(now.getTime() + 500);
    expect(countThisWeek([{ createdAt: aheadOfNow, completedAt: aheadOfNow }], now)).toEqual({ created: 1, completed: 1 });
  });
});

describe("nextCompletedAt", () => {
  const earlier = daysAgo(10);

  it("stamps the time when a task moves into Done", () => {
    expect(nextCompletedAt({ status: "in_progress", completedAt: null }, "done", now)).toEqual(now);
  });

  it("keeps the original time when a done task is marked done again", () => {
    expect(nextCompletedAt({ status: "done", completedAt: earlier }, "done", now)).toEqual(earlier);
  });

  it("clears the time when a task leaves Done", () => {
    expect(nextCompletedAt({ status: "done", completedAt: earlier }, "todo", now)).toBeNull();
  });
});
