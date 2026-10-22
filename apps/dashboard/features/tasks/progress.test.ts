import { describe, expect, it } from "vitest";

import { summarizeTasks } from "./progress";

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
