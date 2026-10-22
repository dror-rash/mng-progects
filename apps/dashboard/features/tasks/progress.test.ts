import { describe, expect, it } from "vitest";

import { summarizeByProject, summarizeTasks } from "./progress";

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

describe("summarizeByProject", () => {
  it("summarizes each project's tasks in one pass", () => {
    const byProject = summarizeByProject([
      { projectId: "a", status: "done" },
      { projectId: "a", status: "todo" },
      { projectId: "b", status: "in_progress" },
    ]);

    expect(byProject.get("a")).toEqual({ total: 2, done: 1, open: 1, completionRate: 50 });
    expect(byProject.get("b")).toEqual({ total: 1, done: 0, open: 1, completionRate: 0 });
  });

  it("has no entry for a project without tasks", () => {
    expect(summarizeByProject([]).get("a")).toBeUndefined();
  });
});
