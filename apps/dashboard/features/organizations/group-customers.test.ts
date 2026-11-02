import { describe, expect, it } from "vitest";

import { groupCustomers } from "./group-customers";

const row = (id: string, parentId: string | null = null) => ({ id, parentId });

describe("groupCustomers", () => {
  it("puts each sub-company right after its parent, keeping the order otherwise", () => {
    const rows = [row("acme"), row("globex"), row("acme-retail", "acme"), row("initech"), row("acme-online", "acme")];
    expect(groupCustomers(rows).map((r) => r.id)).toEqual(["acme", "acme-retail", "acme-online", "globex", "initech"]);
  });

  it("keeps a sub-company in its own place when its parent isn't listed", () => {
    const rows = [row("globex"), row("acme-retail", "acme"), row("initech")];
    expect(groupCustomers(rows).map((r) => r.id)).toEqual(["globex", "acme-retail", "initech"]);
  });

  it("marks sub-companies listed under their parent", () => {
    const grouped = groupCustomers([row("acme"), row("acme-retail", "acme"), row("lone", "gone")]);
    expect(grouped.map((r) => r.nested)).toEqual([false, true, false]);
  });
});
