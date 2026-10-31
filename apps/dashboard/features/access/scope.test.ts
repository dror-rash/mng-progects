import { describe, expect, it } from "vitest";

import { canChange, canChangeCustomers } from "./scope";

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
