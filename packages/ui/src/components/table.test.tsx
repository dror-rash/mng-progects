import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, TableSortIndicator } from "./table";

function Example() {
  return (
    <Table>
      <TableCaption>Projects</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">Website Redesign</TableHead>
          <TableCell>In progress</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("Table", () => {
  it("is a table named by its caption", () => {
    render(<Example />);
    expect(screen.getByRole("table", { name: "Projects" })).toBeInTheDocument();
  });

  it("has column headers and row headers", () => {
    render(<Example />);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Name", "Status"]);
    const row = screen.getByRole("row", { name: /Website Redesign/ });
    expect(within(row).getByRole("rowheader")).toHaveTextContent("Website Redesign");
    expect(within(row).getByRole("cell")).toHaveTextContent("In progress");
  });

  it("scrolls sideways inside its wrapper on narrow screens", () => {
    render(<Example />);
    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
  });
});

describe("TableSortIndicator", () => {
  it("shows which way a column is sorted without adding to the header's name", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead aria-sort="ascending">
              Name <TableSortIndicator direction="ascending" />
            </TableHead>
          </tr>
        </thead>
      </table>,
    );
    const header = screen.getByRole("columnheader", { name: "Name" });
    expect(header.querySelector("[data-direction='ascending']")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a faint marker on a column that isn't sorted", () => {
    const { container } = render(<TableSortIndicator />);
    expect(container.querySelector("[data-direction='none']")).toBeInTheDocument();
  });
});
