// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CustomersTable } from "./customers-table";

const acme = {
  id: "acme",
  name: "Acme Ltd",
  status: "active",
  tags: ["retail"],
  subCompanyCount: 1,
  siteCount: 2,
  projectCount: 3,
  primaryContactName: "Dana Levi",
};
const globex = { ...acme, id: "globex", name: "Globex", status: "lead", tags: [], subCompanyCount: 0, siteCount: 0, projectCount: 0, primaryContactName: null };

afterEach(cleanup);

describe("CustomersTable", () => {
  it("names each row by its customer link, with its tags", () => {
    render(<CustomersTable customers={[acme, globex]} filtered={false} canAdd />);

    const table = screen.getByRole("table", { name: "Customers" });
    const headers = within(table).getAllByRole("rowheader");
    expect(headers.map((h) => within(h).getByRole("link").textContent)).toEqual(["Acme Ltd", "Globex"]);
    expect(within(headers[0]!).getByRole("link")).toHaveProperty("pathname", "/customers/acme");
    expect(headers[0]!.textContent).toContain("retail");
  });

  it("shows the status, the counts and the primary contact under their columns", () => {
    render(<CustomersTable customers={[acme]} filtered={false} canAdd />);

    const columns = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(columns).toEqual(["Customer", "Status", "Sub-companies", "Sites", "Projects", "Primary contact"]);
    const cells = within(screen.getAllByRole("row")[1]!).getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toEqual(["Active", "1", "2", "3", "Dana Levi"]);
  });

  it("says how to add the first customer when there are none", () => {
    render(<CustomersTable customers={[]} filtered={false} canAdd />);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("No customers yet. Add your first one with “New customer”.")).toBeTruthy();
  });

  it("says there are none to those who can't add one", () => {
    render(<CustomersTable customers={[]} filtered={false} canAdd={false} />);

    expect(screen.getByText("No customers yet.")).toBeTruthy();
  });

  it("offers to clear filters that match nothing", () => {
    render(<CustomersTable customers={[]} filtered canAdd />);

    expect(screen.getByText(/No customers match these filters\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveProperty("pathname", "/customers");
  });
});
