import { describe, expect, it } from "vitest";

import { nextCompletedAt, weekAgo } from "./activity";

const now = new Date("2026-10-22T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("weekAgo", () => {
  it("is exactly seven days before now", () => {
    expect(weekAgo(now)).toEqual(daysAgo(7));
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
