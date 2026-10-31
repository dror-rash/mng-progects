import { describe, expect, it } from "vitest";

import { parseProjectStatus, projectStatus, projectStatusLabel } from "./project-status";

describe("projectStatus", () => {
  it("is no tasks when the project has none", () => {
    expect(projectStatus([])).toBe("no_tasks");
  });

  it("is not started when every task is still to do", () => {
    expect(projectStatus([{ status: "todo", count: 3 }])).toBe("not_started");
  });

  it("is in progress once a task is started", () => {
    expect(projectStatus([{ status: "todo", count: 2 }, { status: "in_progress", count: 1 }])).toBe("in_progress");
  });

  it("is in progress when some tasks are done and others aren't started", () => {
    expect(projectStatus([{ status: "todo", count: 2 }, { status: "done", count: 1 }])).toBe("in_progress");
  });

  it("is done when every task is done", () => {
    expect(projectStatus([{ status: "done", count: 4 }])).toBe("done");
  });

  it("counts an unknown task status as not started", () => {
    expect(projectStatus([{ status: "archived", count: 1 }])).toBe("not_started");
  });

  it("ignores statuses with no tasks", () => {
    expect(projectStatus([{ status: "done", count: 2 }, { status: "todo", count: 0 }])).toBe("done");
  });
});

describe("parseProjectStatus", () => {
  it("accepts a known status and rejects anything else", () => {
    expect(parseProjectStatus("in_progress")).toBe("in_progress");
    expect(parseProjectStatus("archived")).toBeNull();
    expect(parseProjectStatus(undefined)).toBeNull();
  });
});

describe("projectStatusLabel", () => {
  it("gives the label for a status", () => {
    expect(projectStatusLabel("not_started")).toBe("Not started");
  });
});
