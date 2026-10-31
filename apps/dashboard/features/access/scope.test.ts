import { describe, expect, it } from "vitest";

import { canChange, canChangeCustomers, canRestore, canSeeCustomers, canSeeDeleted, canSeePartners } from "./scope";

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

describe("canSeeDeleted", () => {
  it("lets admins and auditors see the Deleted page, never partners", () => {
    expect(canSeeDeleted("admin")).toBe(true);
    expect(canSeeDeleted("auditor")).toBe(true);
    expect(canSeeDeleted("partner")).toBe(false);
  });
});

describe("canRestore", () => {
  it("is true only for admins", () => {
    expect(canRestore("admin")).toBe(true);
    expect(canRestore("auditor")).toBe(false);
    expect(canRestore("partner")).toBe(false);
  });
});
