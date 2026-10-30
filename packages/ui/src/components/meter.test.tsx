import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows its label and percentage in a tooltip when focused", async () => {
    const user = userEvent.setup();
    render(<Meter label="Launch progress" value={40} />);

    await user.tab();

    const meter = screen.getByRole("progressbar", { name: "Launch progress" });
    expect(meter).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Launch progress: 40%");
    expect(meter).toHaveAccessibleDescription("Launch progress: 40%");
  });
});
