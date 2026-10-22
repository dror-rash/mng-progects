import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StackedBar } from "./stacked-bar";

const segments = [
  { label: "To do", value: 2 },
  { label: "In progress", value: 1 },
  { label: "Done", value: 1 },
];

describe("StackedBar", () => {
  it("is a figure named by its label", () => {
    render(<StackedBar label="Tasks by status" segments={segments} />);
    expect(screen.getByRole("figure", { name: "Tasks by status" })).toBeInTheDocument();
  });

  it("lists every segment with its value in the legend", () => {
    render(<StackedBar label="Tasks by status" segments={segments} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["To do2", "In progress1", "Done1"]);
  });

  it("sizes each segment by its share of the total", () => {
    const { container } = render(<StackedBar label="Tasks by status" segments={segments} />);

    const widths = [...container.querySelectorAll<HTMLElement>("[data-segment]")].map((el) => el.style.flexGrow);
    expect(widths).toEqual(["2", "1", "1"]);
  });

  it("shows an empty message when every value is zero", () => {
    render(<StackedBar label="Tasks by status" segments={[{ label: "To do", value: 0 }]} emptyText="No tasks yet" />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });

  it("gives up to five segments their own color", () => {
    const five = ["A", "B", "C", "D", "E"].map((label) => ({ label, value: 1 }));
    const { container } = render(<StackedBar label="Five" segments={five} />);

    const colors = [...container.querySelectorAll<HTMLElement>("[data-segment]")].map((el) =>
      [...el.classList].find((c) => c.startsWith("bg-chart-")),
    );
    expect(colors).toEqual(["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]);
  });
});
