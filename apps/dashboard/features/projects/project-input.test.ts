import { describe, expect, it } from "vitest";

import { parseProjectInput } from "./project-input";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseProjectInput", () => {
  it("trims the name and description", () => {
    expect(parseProjectInput(form({ name: "  Launch  ", description: " Q4 launch " }))).toEqual({
      ok: true,
      value: { name: "Launch", description: "Q4 launch", organizationId: null },
    });
  });

  it("rejects an empty name", () => {
    expect(parseProjectInput(form({ name: "   ", description: "x" }))).toEqual({
      ok: false,
      error: "Project name is required",
    });
  });

  it("stores an empty description as null", () => {
    expect(parseProjectInput(form({ name: "Launch", description: "" }))).toEqual({
      ok: true,
      value: { name: "Launch", description: null, organizationId: null },
    });
  });

  it("reads the chosen customer, or none when left empty", () => {
    const withCustomer = parseProjectInput(form({ name: "Launch", customerId: "cust-1" }));
    const without = parseProjectInput(form({ name: "Launch", customerId: "" }));

    expect(withCustomer.ok && withCustomer.value.organizationId).toBe("cust-1");
    expect(without.ok && without.value.organizationId).toBeNull();
  });
});
