import { describe, expect, it } from "vitest";

import { ORGANIZATION_STATUSES, parseOrganizationStatus } from "./organization-kinds";

describe("ORGANIZATION_STATUSES", () => {
  it("lists statuses in lifecycle order", () => {
    expect(ORGANIZATION_STATUSES.map((s) => s.label)).toEqual(["Lead", "Active", "Past"]);
  });
});

describe("parseOrganizationStatus", () => {
  it("accepts a known status and rejects anything else", () => {
    expect(parseOrganizationStatus("past")).toBe("past");
    expect(parseOrganizationStatus("archived")).toBeNull();
    expect(parseOrganizationStatus(null)).toBeNull();
  });
});
