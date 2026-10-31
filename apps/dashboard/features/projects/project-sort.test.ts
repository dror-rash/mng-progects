import { describe, expect, it } from "vitest";

import { DEFAULT_SORT, nextSort, parseProjectSort, sortParams, sortProjects } from "./project-sort";

describe("parseProjectSort", () => {
  it("sorts by start date, newest first, when there are no params", () => {
    expect(parseProjectSort({})).toEqual({ column: "started", dir: "desc" });
  });

  it("reads the column and direction", () => {
    expect(parseProjectSort({ sort: "name", dir: "desc" })).toEqual({ column: "name", dir: "desc" });
  });

  it("uses the column's own first direction when none is given", () => {
    expect(parseProjectSort({ sort: "progress" })).toEqual({ column: "progress", dir: "desc" });
    expect(parseProjectSort({ sort: "customer" })).toEqual({ column: "customer", dir: "asc" });
  });

  it("ignores an unknown column, and an unknown direction", () => {
    expect(parseProjectSort({ sort: "budget", dir: "desc" })).toEqual(DEFAULT_SORT);
    expect(parseProjectSort({ sort: "name", dir: "sideways" })).toEqual({ column: "name", dir: "asc" });
  });
});

describe("sortParams", () => {
  it("leaves out the default sort", () => {
    expect(sortParams(DEFAULT_SORT)).toEqual({});
  });

  it("leaves out the direction when it's the column's first one", () => {
    expect(sortParams({ column: "name", dir: "asc" })).toEqual({ sort: "name" });
    expect(sortParams({ column: "name", dir: "desc" })).toEqual({ sort: "name", dir: "desc" });
    expect(sortParams({ column: "started", dir: "asc" })).toEqual({ dir: "asc" });
  });
});

describe("nextSort", () => {
  it("reverses the column that is already sorted", () => {
    expect(nextSort({ column: "name", dir: "asc" }, "name")).toEqual({ column: "name", dir: "desc" });
    expect(nextSort({ column: "name", dir: "desc" }, "name")).toEqual({ column: "name", dir: "asc" });
  });

  it("starts another column in its first direction", () => {
    expect(nextSort({ column: "name", dir: "desc" }, "overdue")).toEqual({ column: "overdue", dir: "desc" });
    expect(nextSort(DEFAULT_SORT, "status")).toEqual({ column: "status", dir: "asc" });
  });
});

const project = (name: string, extra: Partial<Parameters<typeof sortProjects>[0][number]> = {}) => ({
  name,
  customerName: null,
  status: "no_tasks" as const,
  progress: 0,
  overdue: 0,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  ...extra,
});

const names = (rows: { name: string }[]) => rows.map((r) => r.name);

describe("sortProjects", () => {
  it("sorts by name ignoring case", () => {
    const rows = [project("beta"), project("Alpha"), project("gamma")];
    expect(names(sortProjects(rows, { column: "name", dir: "asc" }))).toEqual(["Alpha", "beta", "gamma"]);
    expect(names(sortProjects(rows, { column: "name", dir: "desc" }))).toEqual(["gamma", "beta", "Alpha"]);
  });

  it("puts projects without a customer last in both directions", () => {
    const rows = [project("none"), project("b", { customerName: "Globex" }), project("a", { customerName: "Acme" })];
    expect(names(sortProjects(rows, { column: "customer", dir: "asc" }))).toEqual(["a", "b", "none"]);
    expect(names(sortProjects(rows, { column: "customer", dir: "desc" }))).toEqual(["b", "a", "none"]);
  });

  it("sorts statuses in their own order, not alphabetically", () => {
    const rows = [project("done", { status: "done" }), project("new", { status: "not_started" }), project("empty")];
    expect(names(sortProjects(rows, { column: "status", dir: "asc" }))).toEqual(["empty", "new", "done"]);
  });

  it("sorts by progress, overdue and start date", () => {
    const rows = [
      project("old", { progress: 0.5, overdue: 0, createdAt: new Date("2026-01-01T00:00:00Z") }),
      project("new", { progress: 0.2, overdue: 3, createdAt: new Date("2026-06-01T00:00:00Z") }),
    ];
    expect(names(sortProjects(rows, { column: "progress", dir: "desc" }))).toEqual(["old", "new"]);
    expect(names(sortProjects(rows, { column: "overdue", dir: "desc" }))).toEqual(["new", "old"]);
    expect(names(sortProjects(rows, { column: "started", dir: "asc" }))).toEqual(["old", "new"]);
  });

  it("keeps ties in their original order, and doesn't change the input", () => {
    const rows = [project("first"), project("second"), project("third")];
    expect(names(sortProjects(rows, { column: "overdue", dir: "desc" }))).toEqual(["first", "second", "third"]);
    expect(names(sortProjects(rows, { column: "overdue", dir: "asc" }))).toEqual(["first", "second", "third"]);
    sortProjects(rows, { column: "name", dir: "desc" });
    expect(names(rows)).toEqual(["first", "second", "third"]);
  });
});
