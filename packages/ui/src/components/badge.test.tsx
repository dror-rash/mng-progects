import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  it("shows its label", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("supports an outline variant for tags", () => {
    render(<Badge variant="outline">retail</Badge>);
    expect(screen.getByText("retail")).toHaveClass("border");
  });
});
