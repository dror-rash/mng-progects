import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

function Example() {
  return (
    <Tooltip>
      <TooltipTrigger>Save</TooltipTrigger>
      <TooltipContent>Saves your changes</TooltipContent>
    </Tooltip>
  );
}

describe("Tooltip", () => {
  it("is hidden until its trigger is focused", () => {
    render(<Example />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows its content and describes the trigger on keyboard focus", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Saves your changes");
    expect(screen.getByRole("button", { name: "Save" })).toHaveAccessibleDescription("Saves your changes");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await screen.findByRole("tooltip");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
