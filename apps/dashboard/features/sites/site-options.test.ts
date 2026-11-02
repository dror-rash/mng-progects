import { describe, expect, it } from "vitest";

import { siteOptionsFor } from "./site-options";

const choices = [
  { id: "s1", name: "Haifa warehouse", organizationId: "acme", customerParentId: null, customerName: "Acme Ltd" },
  { id: "s2", name: "Dizengoff store", organizationId: "retail", customerParentId: "acme", customerName: "Acme Retail" },
  { id: "s3", name: "Globex plant", organizationId: "globex", customerParentId: null, customerName: "Globex" },
  { id: "s4", name: "Acme HQ", organizationId: "acme", customerParentId: null, customerName: "Acme Ltd" },
];

describe("siteOptionsFor", () => {
  it("offers a customer's own sites and its sub-companies' sites, named after the sub-company, by label", () => {
    expect(siteOptionsFor("acme", choices)).toEqual([
      { id: "s4", label: "Acme HQ" },
      { id: "s2", label: "Dizengoff store (Acme Retail)" },
      { id: "s1", label: "Haifa warehouse" },
    ]);
  });

  it("offers a sub-company only its own sites", () => {
    expect(siteOptionsFor("retail", choices)).toEqual([{ id: "s2", label: "Dizengoff store" }]);
  });

  it("offers nothing without a customer, or for a customer without sites", () => {
    expect(siteOptionsFor("", choices)).toEqual([]);
    expect(siteOptionsFor("initech", choices)).toEqual([]);
  });
});
