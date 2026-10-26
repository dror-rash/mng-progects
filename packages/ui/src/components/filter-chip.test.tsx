import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FilterChip } from "./filter-chip";

describe("FilterChip", () => {
  it("renders its child link and marks the selected chip for assistive tech", () => {
    render(
      <>
        <FilterChip selected>
          <a href="?status=lead">Lead</a>
        </FilterChip>
        <FilterChip>
          <a href="?status=past">Past</a>
        </FilterChip>
      </>,
    );

    expect(screen.getByRole("link", { name: "Lead" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Past" })).not.toHaveAttribute("aria-current");
  });
});
