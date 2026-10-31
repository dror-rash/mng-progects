import { describe, expect, it } from "vitest";

import { canChange, canChangeCustomers, canSeeCustomers, canSeePartners } from "./scope";

describe("canChange", () => {
  it("is false for an auditor, who sees everything and changes nothing", () => {
    expect(canChange("auditor")).toBe(false);
  });

  it("is true for admins and partners", () => {
    expect(canChange("admin")).toBe(true);
    expect(canChange("partner")).toBe(true);
  });
});

describe("canChangeCustomers", () => {
  it("is true only for admins", () => {
    expect(canChangeCustomers("admin")).toBe(true);
    expect(canChangeCustomers("auditor")).toBe(false);
    expect(canChangeCustomers("partner")).toBe(false);
  });
});

describe("canSeePartners", () => {
  it("lets admins and auditors see partner companies, not partners", () => {
    expect(canSeePartners("admin")).toBe(true);
    expect(canSeePartners("auditor")).toBe(true);
    expect(canSeePartners("partner")).toBe(false);
  });
});

describe("canSeeCustomers", () => {
  it("lets admins and auditors see customer pages; partners see only names", () => {
    expect(canSeeCustomers("admin")).toBe(true);
    expect(canSeeCustomers("auditor")).toBe(true);
    expect(canSeeCustomers("partner")).toBe(false);
  });
});
