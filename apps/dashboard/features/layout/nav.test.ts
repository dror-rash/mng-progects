import { describe, expect, it } from "vitest";

import { navFor } from "./nav";

const labels = (role: Parameters<typeof navFor>[0]) => navFor(role).map((item) => item.label);

describe("navFor", () => {
  it("gives admins Overview, All projects and Customers", () => {
    expect(labels("admin")).toEqual(["Overview", "All projects", "Customers"]);
  });

  it("gives auditors Overview, All projects and Customers", () => {
    expect(labels("auditor")).toEqual(["Overview", "All projects", "Customers"]);
  });

  it("gives partners Overview and All projects", () => {
    expect(labels("partner")).toEqual(["Overview", "All projects"]);
  });

  it("gives workers Overview and All projects", () => {
    expect(labels("worker")).toEqual(["Overview", "All projects"]);
  });

  it("links each item inside the dashboard zone", () => {
    expect(navFor("admin").map((item) => item.href)).toEqual(["/", "/projects", "/customers"]);
  });
});
