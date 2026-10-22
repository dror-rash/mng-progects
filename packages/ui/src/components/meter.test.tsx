import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Meter } from "./meter";

describe("Meter", () => {
  it("exposes its value as an accessible progress bar", () => {
    render(<Meter label="Launch progress" value={40} />);

    const meter = screen.getByRole("progressbar", { name: "Launch progress" });
    expect(meter).toHaveAttribute("aria-valuenow", "40");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps values outside 0 to 100", () => {
    render(<Meter label="Over" value={140} />);
    expect(screen.getByRole("progressbar", { name: "Over" })).toHaveAttribute("aria-valuenow", "100");
  });
});
