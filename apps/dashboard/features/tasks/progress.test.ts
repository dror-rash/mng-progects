import { describe, expect, it } from "vitest";

import { summarizeProjectStatusCounts, summarizeStatusCounts, summarizeTasks } from "./progress";

describe("summarizeTasks", () => {
  it("counts open and done tasks and rounds the completion rate", () => {
    const summary = summarizeTasks([{ status: "todo" }, { status: "in_progress" }, { status: "done" }]);

    expect(summary).toEqual({ total: 3, done: 1, open: 2, completionRate: 33 });
  });

  it("reports a 0% completion rate when there are no tasks", () => {
    expect(summarizeTasks([])).toEqual({ total: 0, done: 0, open: 0, completionRate: 0 });
  });

  it("counts a task with an unknown status as open", () => {
    expect(summarizeTasks([{ status: "legacy" }]).open).toBe(1);
  });
});

describe("summarizeStatusCounts", () => {
  it("adds up grouped status counts into a summary", () => {
    const summary = summarizeStatusCounts([
      { status: "todo", count: 4 },
      { status: "in_progress", count: 2 },
      { status: "done", count: 3 },
    ]);

    expect(summary).toEqual({ total: 9, done: 3, open: 6, completionRate: 33 });
  });

  it("reports a 0% completion rate when there are no rows", () => {
    expect(summarizeStatusCounts([])).toEqual({ total: 0, done: 0, open: 0, completionRate: 0 });
  });

  it("counts tasks with an unknown status as open", () => {
    expect(summarizeStatusCounts([{ status: "legacy", count: 2 }]).open).toBe(2);
  });
});

describe("summarizeProjectStatusCounts", () => {
  it("builds one summary per project from rows grouped by project and status", () => {
    const byProject = summarizeProjectStatusCounts([
      { projectId: "a", status: "done", count: 1 },
      { projectId: "a", status: "todo", count: 1 },
      { projectId: "b", status: "in_progress", count: 3 },
    ]);

    expect(byProject.get("a")).toEqual({ total: 2, done: 1, open: 1, completionRate: 50 });
    expect(byProject.get("b")).toEqual({ total: 3, done: 0, open: 3, completionRate: 0 });
  });

  it("has no entry for a project without tasks", () => {
    expect(summarizeProjectStatusCounts([]).get("a")).toBeUndefined();
  });
});
