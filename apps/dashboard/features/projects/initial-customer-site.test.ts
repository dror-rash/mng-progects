import { describe, expect, it } from "vitest";

import type { SiteChoice } from "@/features/sites/site-options";

import { initialCustomerAndSite } from "./initial-customer-site";

const customers = [
  { id: "acme", name: "Acme Ltd" },
  { id: "acme-retail", name: "Acme Ltd › Acme Retail" },
  { id: "globex", name: "Globex" },
];
const site = (id: string, organizationId: string, customerParentId: string | null = null): SiteChoice => ({
  id,
  name: id,
  organizationId,
  customerParentId,
  customerName: organizationId,
});
const sites = [site("haifa", "acme"), site("dizengoff", "acme-retail", "acme"), site("orphan", "initech")];

describe("initialCustomerAndSite", () => {
  it("chooses nothing without a link", () => {
    expect(initialCustomerAndSite({}, customers, sites)).toEqual({});
  });

  it("chooses a customer I can choose", () => {
    expect(initialCustomerAndSite({ customer: "globex" }, customers, sites)).toEqual({ customerId: "globex" });
  });

  it("ignores a customer I can't choose", () => {
    expect(initialCustomerAndSite({ customer: "initech" }, customers, sites)).toEqual({});
  });

  it("chooses a site I can choose and its own customer", () => {
    expect(initialCustomerAndSite({ site: "haifa" }, customers, sites)).toEqual({ customerId: "acme", siteId: "haifa" });
  });

  it("chooses the sub-company for a sub-company's site", () => {
    expect(initialCustomerAndSite({ site: "dizengoff" }, customers, sites)).toEqual({
      customerId: "acme-retail",
      siteId: "dizengoff",
    });
  });

  it("ignores a site I can't choose", () => {
    expect(initialCustomerAndSite({ site: "not-a-site" }, customers, sites)).toEqual({});
  });

  it("ignores a site whose customer I can't choose", () => {
    expect(initialCustomerAndSite({ site: "orphan" }, customers, sites)).toEqual({});
  });

  it("prefers the site to the customer when both are given", () => {
    expect(initialCustomerAndSite({ customer: "globex", site: "haifa" }, customers, sites)).toEqual({
      customerId: "acme",
      siteId: "haifa",
    });
  });

  it("falls back to the customer when the site is ignored", () => {
    expect(initialCustomerAndSite({ customer: "globex", site: "not-a-site" }, customers, sites)).toEqual({
      customerId: "globex",
    });
  });
});
