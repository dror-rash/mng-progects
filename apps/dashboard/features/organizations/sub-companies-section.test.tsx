// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SubCompaniesSection } from "./sub-companies-section";

afterEach(cleanup);

describe("SubCompaniesSection", () => {
  it("shows each sub-company's site count beside its link", () => {
    render(
      <SubCompaniesSection
        parentId="acme"
        canAdd={false}
        subCompanies={[
          { id: "retail", name: "Acme Retail", status: "active", primaryContactName: null, siteCount: 1 },
          { id: "online", name: "Acme Online", status: "lead", primaryContactName: null, siteCount: 0 },
        ]}
      />,
    );

    const rows = within(screen.getByRole("region", { name: "Sub-companies" })).getAllByRole("listitem");
    expect(within(rows[0]!).getByRole("link", { name: "Acme Retail" })).toHaveProperty("pathname", "/customers/retail");
    expect(rows[0]!.textContent).toContain("1 site");
    expect(rows[1]!.textContent).toContain("No sites");
  });
});
