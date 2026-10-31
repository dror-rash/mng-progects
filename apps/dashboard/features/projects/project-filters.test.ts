import { describe, expect, it } from "vitest";

import { filterParams, filterProjects, NO_CUSTOMER, parseProjectFilters } from "./project-filters";

const customers = ["acme", "globex"];

describe("parseProjectFilters", () => {
  it("shows everything as a table when there are no params", () => {
    expect(parseProjectFilters({}, customers)).toEqual({ overdue: false, view: "table" });
  });

  it("reads every filter and the view", () => {
    expect(
      parseProjectFilters({ customer: "acme", status: "done", overdue: "1", q: "  web  ", view: "tiles" }, customers),
    ).toEqual({ customer: "acme", status: "done", overdue: true, q: "web", view: "tiles" });
  });

  it("accepts projects without a customer", () => {
    expect(parseProjectFilters({ customer: NO_CUSTOMER }, customers).customer).toBe(NO_CUSTOMER);
  });

  it("ignores a customer that isn't one of the workspace's, an unknown status and an unknown view", () => {
    expect(parseProjectFilters({ customer: "someone-else", status: "archived", view: "grid" }, customers)).toEqual({
      overdue: false,
      view: "table",
    });
  });

  it("uses the first value when a param repeats", () => {
    expect(parseProjectFilters({ status: ["done", "no_tasks"] }, customers).status).toBe("done");
  });
});

describe("filterParams", () => {
  it("leaves out the defaults, so a plain link stays plain", () => {
    expect(filterParams({ overdue: false, view: "table" })).toEqual({});
  });

  it("writes every set filter", () => {
    expect(filterParams({ customer: "acme", status: "done", overdue: true, q: "web", view: "tiles" })).toEqual({
      customer: "acme",
      status: "done",
      overdue: "1",
      q: "web",
      view: "tiles",
    });
  });
});

describe("filterProjects", () => {
  const projects = [
    { name: "Website Redesign", organizationId: "acme", status: "in_progress" as const, overdue: 0 },
    { name: "Internal Ops", organizationId: null, status: "not_started" as const, overdue: 2 },
    { name: "Mobile App", organizationId: "globex", status: "done" as const, overdue: 0 },
  ];
  const names = (filters: Parameters<typeof filterProjects>[1]) => filterProjects(projects, filters).map((p) => p.name);

  it("keeps everything without filters, in order", () => {
    expect(names({ overdue: false, view: "table" })).toEqual(["Website Redesign", "Internal Ops", "Mobile App"]);
  });

  it("filters by customer, or by having none", () => {
    expect(names({ customer: "acme", overdue: false, view: "table" })).toEqual(["Website Redesign"]);
    expect(names({ customer: NO_CUSTOMER, overdue: false, view: "table" })).toEqual(["Internal Ops"]);
  });

  it("filters by status", () => {
    expect(names({ status: "done", overdue: false, view: "table" })).toEqual(["Mobile App"]);
  });

  it("keeps only projects with overdue tasks", () => {
    expect(names({ overdue: true, view: "table" })).toEqual(["Internal Ops"]);
  });

  it("searches names without caring about case", () => {
    expect(names({ q: "WEB", overdue: false, view: "table" })).toEqual(["Website Redesign"]);
  });

  it("combines filters", () => {
    expect(names({ q: "o", customer: NO_CUSTOMER, overdue: true, view: "table" })).toEqual(["Internal Ops"]);
    expect(names({ q: "web", customer: NO_CUSTOMER, overdue: false, view: "table" })).toEqual([]);
  });
});
